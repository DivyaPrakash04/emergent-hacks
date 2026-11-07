/**
 * The one place the UI gets ranked rooms from. Wraps the engine: hides suspended
 * listings, picks the commute for the chosen destination, maps trust status to the
 * engine's trust level, and adds the fair-price estimate to each card.
 */
import { applyFix, rankListings, type Preferences, type TrustLevel } from "./rankListings";
import { estimateFairPrice } from "./fairPrice";
import type { DeckCard, Destination, EngineRoom, FairPriceResult, NearMiss, RoomListing } from "./types";

export { applyFix };

const DAY_MS = 86400000;

/** Length of the seeker's stay in days. */
export function stayDays(prefs: Preferences): number {
  return Math.max(0, Math.round((Date.parse(prefs.dates.end) - Date.parse(prefs.dates.start)) / DAY_MS));
}

export function trustLevelOf(room: RoomListing): TrustLevel {
  if (room.source === "outside") return "outside";
  return room.trustStatus === "caution" ? "caution" : "verified";
}

export function toEngineRoom(room: RoomListing, destination: Destination): EngineRoom {
  return { ...room, commuteMinutes: room.commuteByDestination[destination], trust: trustLevelOf(room) };
}

export function fairPriceFor(room: RoomListing, prefs: Preferences): FairPriceResult | null {
  return estimateFairPrice({
    baselineKey: room.fairBaselineKey,
    roomType: room.roomType,
    price: room.pricePerMonth,
    furnished: room.facilities.includes("furnished"),
    privateBath: room.facilities.includes("privateBath"),
    stayDays: stayDays(prefs),
  });
}

export interface DeckResult {
  /** Rooms not yet swiped, best first. Each card keeps its rank, so the second card still says #2. */
  deck: DeckCard[];
  /** Rooms past a walk-away limit or missing a Must, each with the one fix that brings it back. */
  nearMisses: NearMiss[];
  /** How many rooms fit, swiped or not: the "of 6" in "Card 1 of 6". */
  totalRanked: number;
}

/** Rank every visible room for this seeker. Suspended listings never come back. */
export function buildDeck(
  prefs: Preferences,
  rooms: RoomListing[],
  destination: Destination,
  swipedIds: Iterable<string> = [],
): DeckResult {
  const visible = rooms.filter((r) => r.trustStatus !== "suspended").map((r) => toEngineRoom(r, destination));
  const { ranked, filtered } = rankListings(prefs, visible);
  const seen = new Set(swipedIds);
  return {
    deck: ranked.filter((r) => !seen.has(r.listing.id)).map((r) => ({ ...r, fairPrice: fairPriceFor(r.listing, prefs) })),
    nearMisses: filtered.filter((f) => !seen.has(f.listing.id)),
    totalRanked: ranked.length,
  };
}

/** One room's card for the detail page, whether or not it was swiped. */
export function rankRoom(
  prefs: Preferences,
  rooms: RoomListing[],
  destination: Destination,
  id: string,
): { card: DeckCard | null; nearMiss: NearMiss | null } {
  const { deck, nearMisses } = buildDeck(prefs, rooms, destination);
  return { card: deck.find((c) => c.listing.id === id) ?? null, nearMiss: nearMisses.find((n) => n.listing.id === id) ?? null };
}
