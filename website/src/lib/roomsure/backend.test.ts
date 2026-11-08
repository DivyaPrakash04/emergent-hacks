import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./api";
import { toWebsiteCheck, toWebsiteIntake, type BackendCheck, type BackendIntake } from "./backend";
import { DEFAULT_PREFERENCES } from "./defaults";

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

afterEach(() => vi.unstubAllGlobals());

describe("backend mappings", () => {
  it("maps the backend's intake onto Maya's defaults, keeping the source", () => {
    const b: BackendIntake = {
      preferences: { price: { ideal: 900, limit: 1050 }, facilities: { kitchen: "must" } },
      destination: "campus",
      missing: ["Dates"],
      questions: ["Which dates do you need the room for?"],
      source: "claude",
    };
    const r = toWebsiteIntake("  near Brown, $900 to $1,050, need a kitchen  ", b);
    expect(r.source).toBe("claude");
    expect(r.summary).toBe("near Brown, $900 to $1,050, need a kitchen");
    expect(r.destination).toBe("campus");
    expect(r.preferences.price).toEqual({ ideal: 900, limit: 1050 });
    expect(r.preferences.dates).toEqual(DEFAULT_PREFERENCES.dates);
    expect(r.preferences.facilities).toEqual({ kitchen: "must" });
    expect(r.questions).toEqual([{ id: "dates", text: "Which dates do you need the room for?" }]);
  });

  it("maps the backend's check: verdict words, grouped exact quotes, facts, fair price", () => {
    const b: BackendCheck = {
      verdict: "high_risk",
      signals: [
        { id: "price_far_below_fair", severity: "medium", message: "Price is far below the demo fair range", evidence: "$550/month" },
        { id: "cannot_view", severity: "medium", message: "You can't see the room before paying", evidence: "can't show the room" },
        { id: "cannot_view", severity: "medium", message: "You can't see the room before paying", evidence: "mail you the keys" },
        { id: "payment_pressure", severity: "high", message: "Asks for money before you've seen the room", evidence: "wire the $550 deposit today" },
      ],
      facts: { price: 550, neighborhood: "Fox Point", availableFrom: "2027-06-01", roomType: "private", furnished: true },
      fairPrice: { low: 813, high: 1035, mid: 924, label: "Unusually low · demo estimate" },
      source: "rules",
    };
    const r = toWebsiteCheck(b);
    expect(r.verdict).toBe("high");
    expect(r.signals.find((s) => s.id === "cannot_view")?.quotes).toEqual(["can't show the room", "mail you the keys"]);
    expect(r.facts).toEqual({ price: 550, neighborhood: "Fox Point", dates: "From June 1", roomType: "Private room", furnished: true });
    expect(r.fairPrice).toEqual({ low: 813, high: 1035, typical: 924, price: 550, label: "Unusually low" });
    expect(toWebsiteCheck({ ...b, verdict: "no_issues_found", signals: [], fairPrice: null }).verdict).toBe("clear");
  });
});

describe("api: backend first, mocks when no backend answers", () => {
  it("uses the backend's reading when it answers", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({
      preferences: { price: { ideal: 700, limit: 850 } }, destination: "work", missing: [], questions: [], source: "claude",
    })));
    const r = await api.parseIntake("$700 to $850 downtown");
    expect(r.source).toBe("claude");
    expect(r.preferences.price).toEqual({ ideal: 700, limit: 850 });
  });

  it("falls back to the local rules when the network fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    const r = await api.checkListing("Please wire the deposit today, I can't show the room.");
    expect(r.source).toBe("rules");
  });

  it("falls back to local rules when the backend has a temporary server error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ error: "Database unavailable" }, 503)));
    const r = await api.parseIntake("Downtown internship, June to August, around $900, furnished.");
    expect(r.source).toBe("rules");
    expect(r.summary).toContain("Downtown internship");
  });

  it("keeps the seeded room inventory available from the frontend", async () => {
    const listings = await api.getListings();
    expect(listings.length).toBeGreaterThan(0);
    expect(listings.some((room) => room.id === "fox-point")).toBe(true);
  });

  it("falls back when /api isn't a backend (e.g. an HTML 404 from the preview server)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<!doctype html>Not found", { status: 404, headers: { "content-type": "text/html" } })));
    const r = await api.reserve("fox-point");
    expect(r).toMatchObject({ listingId: "fox-point", amount: 950, simulated: true });
  });

  it("shows the backend's real errors instead of hiding them behind the mock", async () => {
    const replies = [
      jsonResponse({ user: { name: "Maya Chen", verified: true }, payments: [] }),
      jsonResponse({ error: "This reservation has already been paid." }, 409),
    ];
    vi.stubGlobal("fetch", vi.fn(async () => replies.shift()!));
    await expect(api.reserve("fox-point")).rejects.toThrow("You've already reserved a room.");
  });

  it("reserves on the backend at the server's price and returns a receipt", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      calls.push(url);
      if (url.endsWith("/me")) {
        return jsonResponse({
          user: { name: "Maya Chen", verified: true },
          payments: calls.filter((c) => c.endsWith("/demo/complete")).length
            ? [{ id: "a1b2c3d4-0000", amount: 102000, status: "paid", created_at: Date.UTC(2026, 10, 7), listing_id: "website/downcity-studio" }]
            : [],
        });
      }
      return jsonResponse({ ok: true });
    }));
    const r = await api.reserve("downcity-studio");
    expect(r).toMatchObject({ listingId: "downcity-studio", amount: 1020, confirmation: "RS-A1B2C3D4", simulated: true });
    expect(calls).toEqual(["/api/me", "/api/payment/start", "/api/demo/complete", "/api/me"]);
  });
});
