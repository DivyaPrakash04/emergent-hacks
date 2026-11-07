// STAND-IN: written in Lovable until Claude Code pushes the real brain files. Safe to replace.
// Wraps the real ranking engine and adds the "Prefer verified hosts" trust multiplier.
import {
  rankListings,
  sentenceFor,
  applyFix as engineApplyFix,
  type Fix,
  type FilteredListing,
  type Listing,
  type Preferences,
  type ScoredListing,
} from "./rankListings";
import type { Destination, RoomListing } from "./types";

export interface DeckPreferences extends Preferences {
  /** When on, rooms whose host is not verified are multiplied by UNVERIFIED_MULTIPLIER. */
  preferVerified?: boolean;
}

export const UNVERIFIED_MULTIPLIER = 0.75;

export type DeckListing = RoomListing & Listing;

export interface DeckCard extends ScoredListing<DeckListing> {
  /** 1 for verified hosts (or when the switch is off), otherwise UNVERIFIED_MULTIPLIER. */
  trustMultiplier: number;
  /** Sum of factor points before the trust multiplier. */
  subtotal: number;
}

export interface Deck {
  deck: DeckCard[];
  nearMisses: FilteredListing<DeckListing>[];
  /** How many rooms fit, including swiped ones. */
  total: number;
}

export function toEngineListing(l: RoomListing, destination: Destination): DeckListing {
  return { ...l, commuteMinutes: l.commute[destination] };
}

export function buildDeck(
  preferences: DeckPreferences,
  listings: RoomListing[],
  destination: Destination,
  swipedIds: Iterable<string> = [],
): Deck {
  const seen = new Set(swipedIds);
  const { ranked, filtered } = rankListings(preferences, listings.map((l) => toEngineListing(l, destination)));

  const adjusted = ranked.map((r) => {
    const trustMultiplier =
      preferences.preferVerified && r.listing.host.trust.level !== "verified" ? UNVERIFIED_MULTIPLIER : 1;
    const exactScore = r.exactScore * trustMultiplier;
    return { ...r, subtotal: r.exactScore, trustMultiplier, exactScore, score: Math.round(exactScore) };
  });
  adjusted.sort(
    (a, b) =>
      b.score - a.score ||
      a.listing.pricePerMonth - b.listing.pricePerMonth ||
      a.listing.commuteMinutes - b.listing.commuteMinutes,
  );
  const cards: DeckCard[] = adjusted.map((c, i) => ({ ...c, rank: i + 1, sentence: sentenceFor(i + 1, c.gains, c.gives) }));

  return {
    deck: cards.filter((c) => !seen.has(c.listing.id)),
    nearMisses: filtered.filter((f) => !seen.has(f.listing.id)),
    total: cards.length,
  };
}

export function applyFix(preferences: DeckPreferences, fix: Fix): DeckPreferences {
  const next: DeckPreferences = engineApplyFix(preferences, fix);
  if (preferences.preferVerified !== undefined) next.preferVerified = preferences.preferVerified;
  return next;
}
