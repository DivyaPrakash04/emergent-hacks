// Connects the website to the Roomsure backend (platform/, Next.js) through /api.
// In dev, Vite proxies /api to the backend (vite.config.ts). When no backend answers
// (the Lovable preview, or the backend isn't running), api.ts falls back to the local
// mocks, so the screens always work. Pure mapping functions are tested in backend.test.ts.
import { DEFAULT_PREFERENCES } from "./defaults";
import type { DeckPreferences } from "./deck";
import type { Need } from "./rankListings";
import type { CheckResult, CheckSignal, Destination, IntakeQuestion, IntakeResult, Reservation, Severity } from "./types";

const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
/** Base URL of the backend API. Same origin by default, so the session cookie just works. */
export const API_BASE = env["VITE_ROOMSURE_API"] ?? "/api";
/** VITE_ROOMSURE_BACKEND=off forces the local mocks (useful in the Lovable preview). */
export const BACKEND_ENABLED = env["VITE_ROOMSURE_BACKEND"] !== "off";

/** Backend is unavailable or has a temporary server failure: use the demo fallback. */
export class BackendUnavailable extends Error {}

/** The backend answered with an error the user should see (e.g. "already reserved"). */
export class BackendError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function callBackend<T>(path: string, body?: unknown, method: "GET" | "POST" = "POST"): Promise<T> {
  if (!BACKEND_ENABLED) throw new BackendUnavailable("backend disabled");
  const init: RequestInit =
    method === "POST"
      ? { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) }
      : { method, credentials: "include" };
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/${path}`, init);
  } catch {
    throw new BackendUnavailable(`no backend at ${API_BASE}`);
  }
  if (!res.headers.get("content-type")?.includes("application/json")) {
    throw new BackendUnavailable(`no backend at ${API_BASE} (status ${res.status})`);
  }
  const data = (await res.json()) as T & { error?: string };
  // Preserve a usable demo if the upstream backend is deployed but temporarily
  // unhealthy (for example, a cold start or database outage). Do not hide 4xx
  // application errors such as duplicate reservations, validation, or rate limits.
  if (res.status >= 500) throw new BackendUnavailable(`backend temporarily unavailable (${res.status})`);
  if (!res.ok) throw new BackendError(data.error ?? `Request failed (${res.status})`, res.status);
  return data;
}

/** Try the backend; if none answers, use the mock. Real backend errors still surface. */
export async function withFallback<T>(real: () => Promise<T>, mock: () => Promise<T>): Promise<T> {
  try {
    return await real();
  } catch (e) {
    if (e instanceof BackendUnavailable) return mock();
    throw e;
  }
}

// ---------- intake ----------

export interface BackendIntake {
  preferences: {
    price?: { ideal: number; limit: number };
    commute?: { ideal: number; limit: number };
    dates?: { start: string; end: string; maxUncoveredDays: number };
    facilities?: Record<string, Need>;
  };
  destination?: Destination;
  missing: string[];
  questions: string[];
  source: "claude" | "rules";
  fallback?: string | null;
}

function questionId(text: string, i: number): string {
  const t = text.toLowerCase();
  if (/budget|\$|pay/.test(t)) return "price";
  if (/date|when/.test(t)) return "dates";
  if (/commute|minute/.test(t)) return "commute";
  if (/campus|downtown|work/.test(t)) return "destination";
  return `q${i + 1}`;
}

/** Backend intake -> the website's IntakeResult. Unstated fields keep Maya's defaults, as the local parser does. */
export function toWebsiteIntake(text: string, b: BackendIntake): IntakeResult {
  const p: DeckPreferences = structuredClone(DEFAULT_PREFERENCES);
  p.facilities = {};
  if (b.preferences.price) p.price = { ...b.preferences.price };
  if (b.preferences.commute) p.commute = { ...b.preferences.commute };
  if (b.preferences.dates) p.dates = { ...b.preferences.dates };
  if (b.preferences.facilities) p.facilities = { ...b.preferences.facilities };
  const seen = new Set<string>();
  const questions: IntakeQuestion[] = b.questions.map((q, i) => {
    let id = questionId(q, i);
    if (seen.has(id)) id = `${id}-${i + 1}`;
    seen.add(id);
    return { id, text: q };
  });
  return { source: b.source, summary: text.trim(), preferences: p, destination: b.destination ?? "work", questions };
}

// ---------- listing check ----------

export interface BackendCheck {
  verdict: "high_risk" | "caution" | "no_issues_found";
  signals: { id: string; severity: Severity; message: string; evidence?: string }[];
  facts: {
    price: number | null;
    neighborhood: string | null;
    availableFrom: string | null;
    roomType: "private" | "shared" | null;
    furnished: boolean | null;
  };
  fairPrice: { low: number; high: number; mid: number; label: string } | null;
  source: "claude" | "rules";
}

const VERDICT: Record<BackendCheck["verdict"], CheckResult["verdict"]> = {
  high_risk: "high",
  caution: "caution",
  no_issues_found: "clear",
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Backend check -> the website's CheckResult. Quotes stay exact substrings of the pasted text. */
export function toWebsiteCheck(b: BackendCheck): CheckResult {
  const byId = new Map<string, CheckSignal>();
  for (const s of b.signals) {
    const signal = byId.get(s.id) ?? { id: s.id, name: s.message, severity: s.severity, quotes: [] };
    if (s.evidence && !signal.quotes.includes(s.evidence)) signal.quotes.push(s.evidence);
    byId.set(s.id, signal);
  }
  const from = b.facts.availableFrom?.match(/^\d{4}-(\d{2})-(\d{2})$/);
  const facts = {
    price: b.facts.price,
    neighborhood: b.facts.neighborhood,
    dates: from ? `From ${MONTHS[Number(from[1]) - 1]} ${Number(from[2])}` : null,
    roomType: b.facts.roomType === "private" ? "Private room" : b.facts.roomType === "shared" ? "Room in a shared apartment" : null,
    furnished: b.facts.furnished,
  };
  const fair = b.fairPrice && b.facts.price != null
    ? {
        low: b.fairPrice.low,
        high: b.fairPrice.high,
        typical: b.fairPrice.mid,
        price: b.facts.price,
        // The website adds "· demo estimate" itself; don't say it twice.
        label: b.fairPrice.label.replace(/\s*·\s*demo estimate$/, ""),
      }
    : null;
  return { source: b.source, verdict: VERDICT[b.verdict], signals: [...byId.values()], facts, ...(fair ? { fairPrice: fair } : {}) };
}

// ---------- reservations ----------

interface BackendMe {
  user: { name: string; verified: boolean } | null;
  payments: { id: string; amount: number; status: string; created_at: number; listing_id: string | null }[];
}

/** Website rooms are priced on the server under "website/<id>" (platform/lib/roomsure/data/website-rooms.ts). */
export const backendListingId = (listingId: string) => `website/${listingId}`;

/** Sign in as the demo seeker (Maya) if this browser has no backend session yet. */
export async function ensureBackendSession(): Promise<BackendMe> {
  const me = await callBackend<BackendMe>("me", undefined, "GET");
  if (me.user) return me;
  await callBackend("demo/login", {});
  return callBackend<BackendMe>("me", undefined, "GET");
}

/** Simulated reservation on the backend; the server sets the price from the room id. */
export async function reserveOnBackend(listingId: string): Promise<Reservation> {
  await ensureBackendSession();
  const id = backendListingId(listingId);
  try {
    await callBackend("payment/start", { listingId: id });
    await callBackend("demo/complete", { kind: "payment", outcome: "success", listingId: id });
  } catch (e) {
    if (e instanceof BackendError && e.status === 409) {
      throw new BackendError("You've already reserved a room. Reset the demo in your Passport to try again.", 409);
    }
    throw e;
  }
  const me = await callBackend<BackendMe>("me", undefined, "GET");
  const paid = me.payments.find((p) => p.listing_id === id && p.status === "paid");
  if (!paid) throw new BackendError("The reservation didn't go through. Please try again.", 500);
  return {
    listingId,
    amount: paid.amount / 100,
    confirmation: "RS-" + paid.id.replace(/-/g, "").slice(0, 8).toUpperCase(),
    createdAt: new Date(paid.created_at).toISOString(),
    simulated: true,
  };
}
