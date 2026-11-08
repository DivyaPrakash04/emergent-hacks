import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./api";
import { buildDeck } from "./deck";
import { DEFAULT_PREFERENCES } from "./defaults";
import { roomTourPath } from "./scans";
import {
  emptyDraft,
  getHostState,
  hostActions,
  hostGate,
  isVerifiedHost,
  priceCheck,
  publishBlockers,
  publishedRooms,
  scamFlags,
  toRoomListing,
  trustFor,
  validateDraft,
  type HostDraft,
} from "./host";

const goodDraft = (): HostDraft => ({
  ...emptyDraft(),
  title: "Sunny corner room near Wayland Square",
  neighborhood: "Wayland Square",
  price: 930,
  deposit: 500,
  availableFrom: "2027-05-28",
  availableTo: "2027-08-31",
  minStayMonths: 2,
  facilities: ["furnished", "kitchen", "laundry"],
  description: "Bright furnished room on the second floor of a quiet house, five minutes from the shops and the bus.",
  photos: ["data:image/jpeg;base64,AAAA"],
});

function verifyHost(right: Parameters<typeof hostActions.setRightToRent>[0] = "owner") {
  hostActions.signInDemo();
  hostActions.completeCheck("email");
  hostActions.completeCheck("id");
  hostActions.completeCheck("card");
  hostActions.setRightToRent(right);
  hostActions.setRulesAccepted(true);
}

beforeEach(() => {
  window.localStorage.clear();
  hostActions.reset();
});

describe("only verified hosts with the right to rent can publish", () => {
  it("lists all four gate steps until each is done", () => {
    expect(hostGate(getHostState()).filter((g) => !g.done)).toHaveLength(4);
    verifyHost();
    expect(isVerifiedHost(getHostState())).toBe(true);
  });

  it("blocks publishing a perfect room from an unverified host", () => {
    hostActions.signInDemo();
    hostActions.updateDraft(goodDraft());
    expect(publishBlockers(getHostState())).toContain("Pass the email, ID and card checks (simulated)");
    expect(hostActions.publish("https://example.test")).toBeNull();
    expect(publishedRooms()).toEqual([]);
  });

  it("a sublet without landlord consent is allowed but marked Caution", () => {
    expect(trustFor("owner")).toEqual({ level: "verified", label: "Verified host · simulated" });
    expect(trustFor("tenant-no-consent")).toEqual({ level: "caution", label: "Caution", reason: "Landlord consent pending" });
  });
});

describe("the listing form", () => {
  it("an empty draft explains every missing piece", () => {
    const fields = validateDraft(emptyDraft()).map((i) => i.field);
    expect(fields).toEqual(expect.arrayContaining(["title", "neighborhood", "price", "description", "photos"]));
  });

  it("a complete draft passes", () => {
    expect(validateDraft(goodDraft())).toEqual([]);
  });

  it("catches a minimum stay longer than the dates and a deposit over two months", () => {
    const short = { ...goodDraft(), availableTo: "2027-06-20", minStayMonths: 2 };
    expect(validateDraft(short).map((i) => i.field)).toContain("minStayMonths");
    expect(validateDraft({ ...goodDraft(), deposit: 3000 }).map((i) => i.field)).toContain("deposit");
  });

  it("a 3D tour can stand in for photos", () => {
    expect(validateDraft({ ...goodDraft(), photos: [], withTour: true })).toEqual([]);
  });

  it("blocks scam-style wording with the exact phrase", () => {
    const d = { ...goodDraft(), description: goodDraft().description + " Please send a $500 deposit by wire transfer today to hold it." };
    expect(scamFlags(d).length).toBeGreaterThan(0);
    hostActions.updateDraft(d);
    verifyHost();
    expect(publishBlockers(getHostState()).some((b) => b.includes("scam sign"))).toBe(true);
  });

  it("compares the price with typical rooms nearby", () => {
    expect(priceCheck({ neighborhood: "Fox Point", price: 600 })?.label).toBe("Unusually low");
    expect(priceCheck({ neighborhood: "Fox Point", price: 980 })?.label).toBe("Fair price");
    expect(priceCheck({ neighborhood: "Fox Point", price: 1400 })?.label).toBe("Above typical");
    expect(priceCheck({ neighborhood: "", price: 900 })).toBeNull();
  });
});

describe("published rooms reach seekers", () => {
  it("builds a seeker-ready room: commute from the neighborhood, details, tour address", () => {
    hostActions.signInDemo();
    const room = toRoomListing(
      { profile: getHostState().profile, rightToRent: "owner", draft: { ...goodDraft(), withTour: true } },
      { id: "host-test", origin: "https://preview.example" },
    );
    expect(room.commute).toEqual({ work: 22, campus: 14 });
    expect(room.scanUrl).toBe("https://preview.example/scans/room3d/index.html");
    expect(room.details).toMatchObject({ roomType: "private", deposit: 500, minStayMonths: 2 });
    expect(room.host).toMatchObject({ name: "Lena", trust: { level: "verified" } });
    expect(room.hostPublished).toBe(true);
    expect(room.photos[0]).toBe("data:image/jpeg;base64,AAAA"); // the host's own photo comes first
    const tourOnly = toRoomListing(
      { profile: getHostState().profile, rightToRent: "owner", draft: { ...goodDraft(), photos: [], withTour: true } },
      { id: "host-tour", origin: "" },
    );
    expect(tourOnly.photos[0]).toMatch(/^data:image\/svg\+xml/); // tour only: a placeholder cover, never a broken image
  });

  it("a room scanned from the host's video wins over the sample tour", () => {
    hostActions.signInDemo();
    const draft = { ...goodDraft(), photos: [], withTour: true, tourUrl: roomTourPath("bathroom-v2") };
    expect(validateDraft(draft)).toEqual([]); // a scanned tour stands in for photos too
    const room = toRoomListing(
      { profile: getHostState().profile, rightToRent: "owner", draft },
      { id: "host-scan", origin: "https://preview.example" },
    );
    expect(room.scanUrl).toBe("https://preview.example/scans/room3d/index.html?room=bathroom-v2");
  });

  it("a Caution room ranks lower than the same room from a verified host", () => {
    const base = { profile: { name: "Lena", email: "l@x.test", demo: true }, draft: goodDraft() };
    const verified = toRoomListing({ ...base, rightToRent: "owner" }, { id: "host-a", origin: "" });
    const caution = toRoomListing({ ...base, rightToRent: "tenant-no-consent" }, { id: "host-b", origin: "" });
    const { deck } = buildDeck(DEFAULT_PREFERENCES, [verified, caution], "work");
    expect(deck.map((c) => c.listing.id)).toEqual(["host-a", "host-b"]);
    expect(deck[1]!.score).toBeLessThan(deck[0]!.score);
  });

  it("publish → in the room list → reserves locally at its own price", async () => {
    verifyHost();
    hostActions.updateDraft(goodDraft());
    const room = hostActions.publish("https://preview.example");
    expect(room).not.toBeNull();
    expect(getHostState().draft).toEqual(emptyDraft());
    expect(publishedRooms().some((l) => l.id === room!.id)).toBe(true); // screens add these via useListings()
    expect((await api.getListings()).some((l) => l.id === room!.id)).toBe(false); // shared list stays SSR-safe
    const receipt = await api.reserve(room!.id);
    expect(receipt).toMatchObject({ listingId: room!.id, amount: 930, simulated: true });
    hostActions.unpublish(room!.id);
    expect(publishedRooms().some((l) => l.id === room!.id)).toBe(false);
  });
});
