// "List your room": host checks, the listing form's rules, and where published rooms live.
// Frontend only for now (the backend API is still being set up): host accounts, checks and
// published rooms are stored in this browser and labeled Simulated. When the backend is
// ready, these become /api/host/... calls. Coordinate with Divya before wiring them.
import { useSyncExternalStore } from "react";
import { checkListingRules } from "./check";
import { FACILITY_KEYS } from "./rankListings";
import type { FairPrice, ListingDetails, RoomListing, TrustInfo } from "./types";

export const HOST_STORAGE_KEY = "roomsure-host-v1";

/** Neighborhoods a host can pick. Typical prices and commute minutes are synthetic demo values. */
export const NEIGHBORHOODS: { name: string; typical: number; commute: { work: number; campus: number } }[] = [
  { name: "College Hill", typical: 1100, commute: { work: 15, campus: 5 } },
  { name: "Cranston", typical: 740, commute: { work: 48, campus: 52 } },
  { name: "Downcity", typical: 1060, commute: { work: 8, campus: 18 } },
  { name: "Elmhurst", typical: 870, commute: { work: 28, campus: 30 } },
  { name: "Federal Hill", typical: 900, commute: { work: 18, campus: 24 } },
  { name: "Fox Point", typical: 980, commute: { work: 25, campus: 12 } },
  { name: "Jewelry District", typical: 1050, commute: { work: 10, campus: 15 } },
  { name: "Mount Pleasant", typical: 780, commute: { work: 22, campus: 24 } },
  { name: "Olneyville", typical: 720, commute: { work: 22, campus: 28 } },
  { name: "Smith Hill", typical: 800, commute: { work: 14, campus: 16 } },
  { name: "Wayland Square", typical: 950, commute: { work: 22, campus: 14 } },
  { name: "West End", typical: 1000, commute: { work: 16, campus: 26 } },
];

export { FACILITY_KEYS };

export type HostCheck = "email" | "id" | "card";
export type RightToRent = "owner" | "tenant-consent" | "tenant-no-consent";
export type RoomType = ListingDetails["roomType"];
export type GuestPolicy = ListingDetails["rules"]["guests"];

export interface HostDraft {
  title: string;
  neighborhood: string;
  roomType: RoomType;
  price: number | null;
  deposit: number | null;
  utilitiesIncluded: boolean;
  availableFrom: string;
  availableTo: string;
  minStayMonths: number;
  facilities: string[];
  rules: ListingDetails["rules"];
  description: string;
  photos: string[];
  withTour: boolean;
}

export interface HostProfile {
  name: string;
  email: string;
  demo: boolean;
}

export interface HostState {
  profile: HostProfile | null;
  checks: Record<HostCheck, boolean>;
  rightToRent: RightToRent | null;
  rulesAccepted: boolean;
  draft: HostDraft;
  published: RoomListing[];
}

export function emptyDraft(): HostDraft {
  return {
    title: "",
    neighborhood: "",
    roomType: "private",
    price: null,
    deposit: null,
    utilitiesIncluded: true,
    availableFrom: "2027-06-01",
    availableTo: "2027-08-31",
    minStayMonths: 1,
    facilities: [],
    rules: { smoking: false, pets: false, guests: "ask", quietHours: "" },
    description: "",
    photos: [],
    withTour: false,
  };
}

export function defaultHostState(): HostState {
  return {
    profile: null,
    checks: { email: false, id: false, card: false },
    rightToRent: null,
    rulesAccepted: false,
    draft: emptyDraft(),
    published: [],
  };
}

// ---------- checks: only verified hosts with the right to rent can publish ----------

export const RIGHT_TO_RENT: { value: RightToRent; label: string; help: string }[] = [
  { value: "owner", label: "I own this place", help: "You're the owner, or you manage it for the owner." },
  { value: "tenant-consent", label: "I rent it, and my landlord agreed to a sublet in writing", help: "Keep the written OK; a seeker may ask to see it." },
  { value: "tenant-no-consent", label: "I rent it, and I haven't asked my landlord yet", help: "You can still list, but seekers will see a Caution badge and your room ranks lower until your landlord agrees." },
];

export function trustFor(right: RightToRent): TrustInfo {
  if (right === "tenant-no-consent") return { level: "caution", label: "Caution", reason: "Landlord consent pending" };
  return { level: "verified", label: right === "owner" ? "Verified host · simulated" : "Verified host · sublet allowed · simulated" };
}

/** The four things a host must finish before publishing, in order. */
export function hostGate(s: Pick<HostState, "profile" | "checks" | "rightToRent" | "rulesAccepted">): { step: string; done: boolean }[] {
  return [
    { step: "Sign in as a host", done: !!s.profile },
    { step: "Pass the email, ID and card checks (simulated)", done: s.checks.email && s.checks.id && s.checks.card },
    { step: "Confirm your right to rent", done: s.rightToRent !== null },
    { step: "Agree to the honest-listing rules", done: s.rulesAccepted },
  ];
}

export const isVerifiedHost = (s: Parameters<typeof hostGate>[0]) => hostGate(s).every((g) => g.done);

// ---------- the listing form ----------

export interface DraftIssue {
  field: keyof HostDraft;
  message: string;
}

const DAY_MS = 86400000;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function validateDraft(d: HostDraft): DraftIssue[] {
  const issues: DraftIssue[] = [];
  const title = d.title.trim();
  if (title.length < 8 || title.length > 80) issues.push({ field: "title", message: "Give the room a title of 8 to 80 characters, like \"Sunny room near Wayland Square\"." });
  if (!NEIGHBORHOODS.some((n) => n.name === d.neighborhood)) issues.push({ field: "neighborhood", message: "Pick the neighborhood. Seekers see this, never your street address." });
  if (d.price == null || !Number.isFinite(d.price) || d.price < 300 || d.price > 5000) issues.push({ field: "price", message: "Set a monthly price between $300 and $5,000." });
  if (d.deposit != null && (d.deposit < 0 || (d.price != null && d.deposit > d.price * 2))) issues.push({ field: "deposit", message: "Keep the deposit between $0 and two months' rent." });
  const from = ISO.test(d.availableFrom) ? Date.parse(d.availableFrom) : NaN;
  const to = ISO.test(d.availableTo) ? Date.parse(d.availableTo) : NaN;
  if (Number.isNaN(from) || Number.isNaN(to) || to <= from) issues.push({ field: "availableTo", message: "The move-out date must be after the move-in date." });
  else if ((to - from) / DAY_MS < d.minStayMonths * 28) issues.push({ field: "minStayMonths", message: `The room is available for less than your ${d.minStayMonths}-month minimum stay.` });
  if (d.minStayMonths < 1 || d.minStayMonths > 6) issues.push({ field: "minStayMonths", message: "Roomsure is for stays of 1 to 6 months." });
  const description = d.description.trim();
  if (description.length < 40) issues.push({ field: "description", message: "Describe the room in at least 40 characters: light, space, who you live with." });
  if (description.length > 1200) issues.push({ field: "description", message: "Keep the description under 1,200 characters." });
  if (!d.photos.length && !d.withTour) issues.push({ field: "photos", message: "Add at least one photo or a 3D tour. Seekers trust rooms they can see." });
  return issues;
}

/** Scam-style wording isn't allowed: the same rules the scam check uses on outside listings. */
export function scamFlags(d: Pick<HostDraft, "title" | "description">): { name: string; quotes: string[] }[] {
  return checkListingRules(`${d.title}\n${d.description}`).signals.map((s) => ({ name: s.name, quotes: s.quotes }));
}

/** Compare the asking price with typical rooms nearby. Low prices are a scam signal to seekers. */
export function priceCheck(d: Pick<HostDraft, "neighborhood" | "price">): (FairPrice & { note: string }) | null {
  const n = NEIGHBORHOODS.find((x) => x.name === d.neighborhood);
  if (!n || d.price == null || !Number.isFinite(d.price)) return null;
  const money = (v: number) => "$" + Math.round(v).toLocaleString("en-US");
  if (d.price < n.typical * 0.7) return { label: "Unusually low", tone: "risk", typical: n.typical, note: `Well under the ${money(n.typical)} typical for ${n.name}. Seekers are warned that very low prices can be a scam sign.` };
  if (d.price < n.typical * 0.9) return { label: "Good deal", tone: "good", typical: n.typical, note: `Below the ${money(n.typical)} typical for ${n.name}.` };
  if (d.price > n.typical * 1.3) return { label: "Above typical", tone: "caution", typical: n.typical, note: `Well over the ${money(n.typical)} typical for ${n.name}. Expect fewer matches.` };
  return { label: "Fair price", tone: "good", typical: n.typical, note: `In line with the ${money(n.typical)} typical for ${n.name}.` };
}

/** Everything that blocks publishing right now, in plain words. Empty means ready. */
export function publishBlockers(s: Pick<HostState, "profile" | "checks" | "rightToRent" | "rulesAccepted" | "draft">): string[] {
  const blockers = hostGate(s).filter((g) => !g.done).map((g) => g.step);
  blockers.push(...validateDraft(s.draft).map((i) => i.message));
  for (const f of scamFlags(s.draft)) blockers.push(`Remove wording seekers would read as a scam sign: "${f.quotes[0]}" (${f.name.toLowerCase()}).`);
  return blockers;
}

export const SAMPLE_TOUR_PATH = "/scans/room3d/index.html";

/** Cover image for a room listed with a 3D tour but no photos, so the card never shows a broken image. */
export function placeholderPhoto(neighborhood: string): string {
  const safe = neighborhood.replace(/[<>&"']/g, "");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#DDF0EC"/><stop offset="1" stop-color="#FDEBD2"/></linearGradient></defs>` +
    `<rect width="1200" height="900" fill="url(#g)"/>` +
    `<text x="600" y="430" text-anchor="middle" font-family="Figtree, Arial, sans-serif" font-size="64" font-weight="700" fill="#0E6B66">${safe}</text>` +
    `<text x="600" y="510" text-anchor="middle" font-family="Figtree, Arial, sans-serif" font-size="40" fill="#1D2B33">Walk through it in 3D</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Turn a finished draft into a room seekers can swipe on. */
export function toRoomListing(s: Pick<HostState, "profile" | "rightToRent" | "draft">, opts: { id: string; origin: string }): RoomListing {
  const d = s.draft;
  const n = NEIGHBORHOODS.find((x) => x.name === d.neighborhood)!;
  const fair = priceCheck(d);
  return {
    id: opts.id,
    title: d.title.trim(),
    neighborhood: d.neighborhood,
    pricePerMonth: d.price!,
    commute: { ...n.commute },
    availableFrom: d.availableFrom,
    availableTo: d.availableTo,
    facilities: [...d.facilities],
    photos: d.photos.length ? [...d.photos] : [placeholderPhoto(d.neighborhood)],
    description: d.description.trim(),
    host: { name: s.profile?.name.split(" ")[0] || "Host", trust: trustFor(s.rightToRent!), repliesIn: "a few hours" },
    fairPrice: fair ? { label: fair.label, tone: fair.tone, typical: fair.typical } : { label: "Fair price", tone: "good", typical: d.price! },
    ...(d.withTour ? { scanUrl: opts.origin + SAMPLE_TOUR_PATH } : {}),
    details: {
      roomType: d.roomType,
      deposit: d.deposit ?? 0,
      utilitiesIncluded: d.utilitiesIncluded,
      minStayMonths: d.minStayMonths,
      rules: { ...d.rules, quietHours: d.rules.quietHours.trim() },
    },
    hostPublished: true,
  };
}

export const isHostPublished = (id: string) => id.startsWith("host-");

// ---------- the store (this browser only) ----------

const SERVER_STATE = defaultHostState();
let state: HostState | null = null;
const listeners = new Set<() => void>();

function isValid(s: unknown): s is HostState {
  if (!s || typeof s !== "object") return false;
  const o = s as Partial<HostState>;
  return !!o.checks && typeof o.checks === "object" && !!o.draft && typeof o.draft === "object" && Array.isArray(o.published);
}

function load(): HostState {
  if (typeof window === "undefined") return defaultHostState();
  try {
    const raw = window.localStorage.getItem(HOST_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isValid(parsed)) return { ...defaultHostState(), ...parsed, draft: { ...emptyDraft(), ...parsed.draft } };
    }
  } catch {
    /* broken storage: start fresh */
  }
  return defaultHostState();
}

export function getHostState(): HostState {
  if (state === null) state = load();
  return state;
}

/** Returns false when the browser refused to save (for example, storage is full). */
function setHostState(patch: Partial<HostState> | ((s: HostState) => Partial<HostState>)): boolean {
  const current = getHostState();
  state = { ...current, ...(typeof patch === "function" ? patch(current) : patch) };
  let saved = true;
  try {
    window.localStorage.setItem(HOST_STORAGE_KEY, JSON.stringify(state));
  } catch {
    saved = false;
  }
  listeners.forEach((l) => l());
  return saved;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useHost<T>(select: (s: HostState) => T): T {
  return useSyncExternalStore(subscribe, () => select(getHostState()), () => select(SERVER_STATE));
}

/** Published rooms, for the seekers' deck. Empty on the server. */
export const publishedRooms = (): RoomListing[] => (typeof window === "undefined" ? [] : getHostState().published);

export const hostActions = {
  signInDemo() {
    setHostState({ profile: { name: "Lena Okafor", email: "lena@demo.roomsure.example", demo: true } });
  },
  signIn(name: string, email: string) {
    setHostState({ profile: { name: name.trim(), email: email.trim(), demo: false }, checks: { email: false, id: false, card: false } });
  },
  signOut() {
    setHostState({ profile: null, checks: { email: false, id: false, card: false }, rightToRent: null, rulesAccepted: false });
  },
  completeCheck(key: HostCheck) {
    setHostState((s) => ({ checks: { ...s.checks, [key]: true } }));
  },
  setRightToRent(rightToRent: RightToRent) {
    setHostState({ rightToRent });
  },
  setRulesAccepted(rulesAccepted: boolean) {
    setHostState({ rulesAccepted });
  },
  updateDraft(patch: Partial<HostDraft>) {
    return setHostState((s) => ({ draft: { ...s.draft, ...patch } }));
  },
  /** Publishes the current draft. Returns the new room, or null if blocked or not saved. */
  publish(origin: string): RoomListing | null {
    const s = getHostState();
    if (publishBlockers(s).length) return null;
    const room = toRoomListing(s, { id: `host-${Date.now().toString(36)}`, origin });
    const saved = setHostState((cur) => ({ published: [...cur.published, room], draft: emptyDraft() }));
    if (!saved) {
      setHostState((cur) => ({ published: cur.published.filter((r) => r.id !== room.id), draft: s.draft }));
      return null;
    }
    return room;
  },
  unpublish(id: string) {
    setHostState((s) => ({ published: s.published.filter((r) => r.id !== id) }));
  },
  reset() {
    setHostState(defaultHostState());
  },
};
