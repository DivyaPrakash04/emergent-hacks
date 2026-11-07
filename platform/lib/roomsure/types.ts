/**
 * Roomsure app types. The ranking engine's own types (Listing, Preferences,
 * ScoredListing, ...) live in rankListings.ts; these extend them for the app.
 * Shared by platform/ and the Lovable UI (synced to src/lib/roomsure/).
 */
import type { FilteredListing, Listing, Preferences, ScoredListing, TrustLevel } from "./rankListings";

export type Destination = "work" | "campus";
export type TrustStatus = "verified" | "caution" | "suspended";

export interface HostInfo {
  name: string;
  /** Simulated checks shown on the host card. */
  checks: { email: boolean; id: boolean; card: boolean };
  /** "Hosting since 2024", shown on the host card. */
  since: string;
}

/** One demo room as stored. Synthetic data: no real people or street addresses. */
export interface RoomListing {
  id: string;
  title: string;
  neighborhood: string;
  description: string;
  pricePerMonth: number;
  availableFrom: string;
  availableTo: string;
  roomType: "private" | "shared";
  /** Engine facility keys: furnished, kitchen, laundry, gym, privateBath, ac, parking. */
  facilities: string[];
  /** Up to 3 photo URLs or paths. */
  photos: string[];
  /** RoomWalk scene, opened in the 3D tour overlay. Labeled "Sample 3D scan · demo". */
  scanUrl?: string;
  host: HostInfo;
  trustStatus: TrustStatus;
  trustReason?: string;
  source: "network" | "outside";
  sublet: boolean;
  landlordConsentConfirmed: boolean;
  commuteByDestination: Record<Destination, number>;
  /** Key into FAIR_BASELINES. */
  fairBaselineKey: string;
  /** What the simulated host does after the seeker swipes Interested. */
  demoHostReply: "accept" | "review";
  isDemo: true;
}

/** A room as the engine sees it for one destination. */
export type EngineRoom = RoomListing & Listing & { commuteMinutes: number; trust: TrustLevel };

export interface FairPriceResult {
  low: number;
  high: number;
  mid: number;
  kind: "fair" | "good_deal" | "unusually_low" | "above";
  /** Card and detail label, e.g. "Fair price · demo estimate". */
  label: string;
  /** Only for kind "above": rounded percent above the high end. */
  percentAbove?: number;
}

/** One card in the deck: the engine's scored listing plus the fair-price estimate. */
export type DeckCard = ScoredListing<EngineRoom> & { fairPrice: FairPriceResult | null };
export type NearMiss = FilteredListing<EngineRoom>;

export interface Session {
  userId: string;
  name: string;
  verified: boolean;
}

export interface IntakeResult {
  preferences: Partial<Preferences>;
  destination?: Destination;
  /** Human-readable names of fields the sentence did not state. */
  missing: string[];
  /** Up to two follow-up questions. */
  questions: string[];
  source: "claude" | "rules";
}

export type ScamSignalId =
  | "price_far_below_fair"
  | "payment_pressure"
  | "cannot_view"
  | "urgency"
  | "off_platform_contact";

export interface ScamSignal {
  id: ScamSignalId;
  severity: "high" | "medium" | "low";
  /** Plain-English name, e.g. "Asks for a wire deposit before viewing". */
  message: string;
  /** Exact substring of the pasted text. Absent for price_far_below_fair. */
  evidence?: string;
  source: "rules" | "claude";
}

export type ScamVerdict = "high_risk" | "caution" | "no_issues_found";

export interface CheckFacts {
  price: number | null;
  neighborhood: string | null;
  availableFrom: string | null;
  roomType: "private" | "shared" | null;
  furnished: boolean | null;
}

export interface CheckResult {
  verdict: ScamVerdict;
  /** "High risk", "Caution" or "No issues found". */
  verdictLabel: string;
  signals: ScamSignal[];
  facts: CheckFacts;
  fairPrice: FairPriceResult | null;
  source: "claude" | "rules";
}

export interface Reservation {
  id: string;
  listingId: string;
  /** USD, from server-side seed data, never from the client. */
  amount: number;
  createdAt: string;
  simulated: true;
}

export interface ChatMessage {
  from: "host" | "seeker";
  text: string;
}
