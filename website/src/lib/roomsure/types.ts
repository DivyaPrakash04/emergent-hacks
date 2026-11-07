// STAND-IN: written in Lovable until Claude Code pushes the real brain files. Safe to replace.
import type { Listing } from "./rankListings";

export type Destination = "work" | "campus";

export type TrustInfo =
  | { level: "verified"; label: string }
  | { level: "caution"; label: string; reason: string };

export interface FairPrice {
  /** Short chip text, e.g. "Fair price". */
  label: string;
  tone: "good" | "caution" | "risk";
  /** Typical monthly price for similar rooms nearby. */
  typical: number;
}

export interface RoomListing extends Omit<Listing, "commuteMinutes"> {
  title: string;
  neighborhood: string;
  /** Minutes to each destination; the deck picks one as commuteMinutes. */
  commute: Record<Destination, number>;
  photos: string[];
  description: string;
  host: { name: string; trust: TrustInfo; repliesIn: string };
  fairPrice: FairPrice;
  /** Present when a sample 3D scan exists. */
  scanUrl?: string;
}

export interface Session {
  userId: string;
  name: string;
  verified: boolean;
}

export interface IntakeQuestion {
  id: string;
  text: string;
}

export interface IntakeResult {
  source: "claude" | "rules";
  summary: string;
  preferences: import("./deck").DeckPreferences;
  destination: Destination;
  questions: IntakeQuestion[];
}

export type Severity = "high" | "medium" | "low";

export interface CheckSignal {
  id: string;
  /** Plain-English name, e.g. "Asks for a wire deposit before viewing". */
  name: string;
  severity: Severity;
  /** Exact substrings of the pasted text. */
  quotes: string[];
}

export interface ListingFacts {
  price: number | null;
  neighborhood: string | null;
  dates: string | null;
  roomType: string | null;
  furnished: boolean | null;
}

export interface CheckResult {
  source: "claude" | "rules";
  verdict: "high" | "caution" | "clear";
  signals: CheckSignal[];
  facts: ListingFacts;
  /** Absent when no estimate is possible. */
  fairPrice?: { low: number; high: number; typical: number; price: number; label: string };
}

export interface Reservation {
  listingId: string;
  amount: number;
  confirmation: string;
  createdAt: string;
  simulated: true;
}

export type HostReply = "reviewing" | "accepted";
