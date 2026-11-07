/**
 * Roomsure ranking engine ("the compromise engine").
 *
 * Scores every listing 0–100 against one seeker's preferences, ranks them into the
 * swipe deck (best match = first card), and explains each score in plain English.
 *
 *   1. Filter: hide listings past a walk-away limit or missing a "must" facility.
 *   2. Score each factor 0–100: 100 at or better than ideal, falling in a straight
 *      line to 0 at the walk-away limit.
 *   3. Weights: importance sliders (0–10), or a drag-to-rank priority order,
 *      turned into weights that add up to 1.
 *   4. Base score = Σ(weight × factor score).
 *   5. Trust: when "Prefer verified hosts" is on (the default), multiply by a trust
 *      factor (verified 1.0, caution 0.85, outside 0.7). Round. Highest first; ties go
 *      to the cheaper listing.
 *
 * Pure functions: no DOM, no network, no AI. Safe to run client-side so the deck
 * re-ranks instantly when a slider moves. Suspended listings must be removed before
 * they reach the engine.
 */

export type Factor = "price" | "commute" | "dates" | "facilities";
export type Need = "none" | "nice" | "important" | "must";
export type TrustLevel = "verified" | "caution" | "outside";

/** Score multiplier per trust level, applied only while preferVerified is on. */
export const TRUST_FACTOR: Record<TrustLevel, number> = { verified: 1, caution: 0.85, outside: 0.7 };

export const FACTORS: Factor[] = ["price", "commute", "dates", "facilities"];

/** Points a facility earns toward the facilities score. "must" only filters. */
export const NEED_POINTS: Record<Need, number> = { none: 0, nice: 1, important: 2, must: 0 };

export interface Listing {
  id: string;
  pricePerMonth: number;
  /** Minutes from this listing to the seeker's destination. See estimateCommuteMinutes(). */
  commuteMinutes: number;
  /** ISO date (YYYY-MM-DD) the room is first available. */
  availableFrom: string;
  /** ISO date (YYYY-MM-DD) the room is last available. */
  availableTo: string;
  /** Facility keys, e.g. ["furnished", "kitchen", "gym"]. */
  facilities: string[];
  /** Defaults to "verified". */
  trust?: TrustLevel;
  /** Plain-English reason for a caution or outside level, e.g. "Landlord consent pending". */
  trustReason?: string;
}

export interface Preferences {
  price: { ideal: number; limit: number };
  commute: { ideal: number; limit: number };
  dates: { start: string; end: string; maxUncoveredDays: number };
  /** How much the seeker needs each facility. Missing keys count as "none". */
  facilities: Record<string, Need>;
  /** 0–10 importance sliders. Used when present. */
  importance?: Partial<Record<Factor, number>>;
  /** Drag-to-rank alternative, most important first (MVP spec section 4 weights). */
  priorityOrder?: Factor[];
  /** "Prefer verified hosts" switch. Defaults to true; false turns the trust factor off. */
  preferVerified?: boolean;
}

/** One "gain" or "give up" fact. label = short chip text, phrase = fits in a sentence. */
export interface Reason {
  factor: Factor | "trust";
  label: string;
  phrase: string;
}

export interface ScoredListing<L extends Listing = Listing> {
  listing: L;
  /** 1 = best match = first card in the deck. */
  rank: number;
  /** 0–100, rounded. The number the card shows. */
  score: number;
  /** baseScore × trustFactor, before rounding. */
  exactScore: number;
  /** Σ points, before the trust factor. */
  baseScore: number;
  /** 1 when preferVerified is off or the listing is verified. */
  trustFactor: number;
  /** 0–100 per factor; null when the factor is not used (no facility picks). */
  factorScores: Record<Factor, number | null>;
  /** Add up to 1. */
  weights: Record<Factor, number>;
  /** weight × factor score; these add up to baseScore. */
  points: Record<Factor, number>;
  uncoveredDays: { start: number; end: number; total: number };
  /** Sorted by how much the seeker cares about each factor. */
  gains: Reason[];
  gives: Reason[];
  /** Template explanation, e.g. "#1 because it covers every date; you give up $50 on price." */
  sentence: string;
}

export type Fix =
  | { kind: "priceLimit"; to: number }
  | { kind: "commuteLimit"; to: number }
  | { kind: "maxUncoveredDays"; to: number }
  | { kind: "facilityNeed"; facilities: string[]; to: Need };

export interface FilterReason {
  factor: Factor;
  message: string;
  /** The smallest preference change that removes this reason. Apply with applyFix(). */
  fix: Fix;
  fixLabel: string;
}

export interface FilteredListing<L extends Listing = Listing> {
  listing: L;
  reasons: FilterReason[];
}

export interface RankResult<L extends Listing = Listing> {
  ranked: ScoredListing<L>[];
  filtered: FilteredListing<L>[];
}

export interface FacilityText {
  label: string;
  has: string;
  lacks: string;
  noun: string;
}

const FACILITY_TEXT: Record<string, FacilityText> = {
  furnished: { label: "Furnished", has: "is furnished", lacks: "Not furnished", noun: "a furnished room" },
  kitchen: { label: "Kitchen", has: "has a kitchen", lacks: "No kitchen", noun: "a kitchen" },
  laundry: { label: "In-unit laundry", has: "has in-unit laundry", lacks: "No in-unit laundry", noun: "in-unit laundry" },
  gym: { label: "Gym", has: "has a gym", lacks: "No gym", noun: "a gym" },
  privateBath: { label: "Private bathroom", has: "has a private bathroom", lacks: "Shared bathroom", noun: "a private bathroom" },
  ac: { label: "Air conditioning", has: "has air conditioning", lacks: "No air conditioning", noun: "air conditioning" },
  parking: { label: "Parking", has: "has parking", lacks: "No parking", noun: "parking" },
};

/** Facility keys with built-in wording. Other keys work too; they use the key as the label. */
export const FACILITY_KEYS: string[] = Object.keys(FACILITY_TEXT);

export function facilityText(key: string): FacilityText {
  return FACILITY_TEXT[key] ?? { label: key, has: `has ${key}`, lacks: `No ${key}`, noun: key };
}

// ---------- small helpers ----------

const DAY_MS = 86400000;

function toDay(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
}

function money(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
}

// ---------- scoring ----------

/**
 * "Lower is better" factor (dollars, minutes, uncovered days).
 * 100 at or below ideal, 0 at the limit, straight line between, null past the limit.
 */
export function closenessScore(value: number, ideal: number, limit: number): number | null {
  if (value <= ideal) return 100;
  if (value > limit) return null;
  return (100 * (limit - value)) / (limit - ideal);
}

/** Days of the seeker's stay the listing does not cover: before it opens and after it closes. */
export function uncoveredDays(listing: Listing, dates: Preferences["dates"]): { start: number; end: number; total: number } {
  const start = toDay(dates.start);
  const end = toDay(dates.end);
  const stay = Math.max(0, end - start);
  const before = Math.min(stay, Math.max(0, toDay(listing.availableFrom) - start));
  const after = Math.min(stay, Math.max(0, end - toDay(listing.availableTo)));
  return { start: before, end: after, total: Math.min(stay, before + after) };
}

/** Facilities only count toward the score when at least one is marked Nice or Important. */
export function activeFactors(prefs: Preferences): Factor[] {
  const anySoft = Object.values(prefs.facilities).some((need) => (NEED_POINTS[need] ?? 0) > 0);
  return FACTORS.filter((f) => f !== "facilities" || anySoft);
}

/**
 * Weights that add up to 1.
 * - importance sliders: each slider ÷ total of the sliders
 * - priorityOrder: position i of n gets (n − i + 1) ÷ (1 + 2 + … + n)
 * - neither, or everything at 0: equal weights
 */
export function weightsFor(prefs: Preferences): Record<Factor, number> {
  const active = activeFactors(prefs);
  const raw: Record<Factor, number> = { price: 0, commute: 0, dates: 0, facilities: 0 };
  if (prefs.importance) {
    for (const f of active) raw[f] = Math.max(0, prefs.importance[f] ?? 0);
  } else if (prefs.priorityOrder && prefs.priorityOrder.length) {
    const order = prefs.priorityOrder.filter((f) => active.includes(f));
    order.forEach((f, i) => { raw[f] = order.length - i; });
  } else {
    for (const f of active) raw[f] = 1;
  }
  const total = active.reduce((sum, f) => sum + raw[f], 0);
  const weights: Record<Factor, number> = { price: 0, commute: 0, dates: 0, facilities: 0 };
  for (const f of active) weights[f] = total > 0 ? raw[f] / total : 1 / active.length;
  return weights;
}

type Unranked<L extends Listing> = Omit<ScoredListing<L>, "rank" | "sentence">;

function evaluate<L extends Listing>(
  listing: L,
  prefs: Preferences,
  weights: Record<Factor, number>,
  active: Factor[],
): Unranked<L> | FilteredListing<L> {
  const price = listing.pricePerMonth;
  const commute = listing.commuteMinutes;
  const gap = uncoveredDays(listing, prefs.dates);

  const factorScores: Record<Factor, number | null> = {
    price: closenessScore(price, prefs.price.ideal, prefs.price.limit),
    commute: closenessScore(commute, prefs.commute.ideal, prefs.commute.limit),
    dates: closenessScore(gap.total, 0, prefs.dates.maxUncoveredDays),
    facilities: null,
  };

  // Facilities: must-haves filter; Nice and Important earn a share of the points.
  let wanted = 0;
  let earned = 0;
  const missingMust: string[] = [];
  const has: { key: string; pts: number }[] = [];
  const lacks: { key: string; pts: number }[] = [];
  for (const [key, need] of Object.entries(prefs.facilities)) {
    const present = listing.facilities.includes(key);
    if (need === "must" && !present) missingMust.push(key);
    const pts = NEED_POINTS[need] ?? 0;
    if (pts > 0) {
      wanted += pts;
      if (present) { earned += pts; has.push({ key, pts }); } else lacks.push({ key, pts });
    }
  }
  if (wanted > 0) factorScores.facilities = (100 * earned) / wanted;

  // Step 1: deal-breakers.
  const reasons: FilterReason[] = [];
  if (factorScores.price === null) {
    reasons.push({
      factor: "price",
      message: `${money(price)} is ${money(price - prefs.price.limit)} over your ${money(prefs.price.limit)} limit`,
      fix: { kind: "priceLimit", to: price },
      fixLabel: `Raise your price limit to ${money(price)}`,
    });
  }
  if (factorScores.commute === null) {
    reasons.push({
      factor: "commute",
      message: `${commute} min is ${commute - prefs.commute.limit} min over your ${prefs.commute.limit}-min limit`,
      fix: { kind: "commuteLimit", to: commute },
      fixLabel: `Raise your commute limit to ${commute} min`,
    });
  }
  if (factorScores.dates === null) {
    reasons.push({
      factor: "dates",
      message: `${plural(gap.total, "day")} of your stay ${gap.total === 1 ? "is" : "are"} uncovered; you allow ${prefs.dates.maxUncoveredDays}`,
      fix: { kind: "maxUncoveredDays", to: gap.total },
      fixLabel: `Allow ${plural(gap.total, "uncovered day")}`,
    });
  }
  if (missingMust.length) {
    const it = missingMust.length > 1 ? "them" : "it";
    reasons.push({
      factor: "facilities",
      message: `${joinList(missingMust.map((k) => facilityText(k).lacks))}. You marked ${it} Must`,
      fix: { kind: "facilityNeed", facilities: missingMust, to: "important" },
      fixLabel: `Make ${it} Important instead`,
    });
  }
  if (reasons.length) return { listing, reasons };

  // Steps 2–4: weighted score.
  const points: Record<Factor, number> = { price: 0, commute: 0, dates: 0, facilities: 0 };
  let baseScore = 0;
  for (const f of active) {
    points[f] = weights[f] * (factorScores[f] ?? 0);
    baseScore += points[f];
  }

  // Step 5: trust, only while "Prefer verified hosts" is on.
  const level: TrustLevel = listing.trust ?? "verified";
  const trustFactor = prefs.preferVerified === false ? 1 : TRUST_FACTOR[level];
  const exactScore = baseScore * trustFactor;

  // Explanation facts.
  const gains: Reason[] = [];
  const gives: Reason[] = [];
  const idealPrice = prefs.price.ideal;
  if (price < idealPrice) gains.push({ factor: "price", label: `${money(idealPrice - price)} under ideal`, phrase: `is ${money(idealPrice - price)} under your ideal price` });
  else if (price === idealPrice) gains.push({ factor: "price", label: "At your ideal price", phrase: "is at your ideal price" });
  else gives.push({ factor: "price", label: `${money(price - idealPrice)} over ideal`, phrase: `${money(price - idealPrice)} on price` });

  const extra = commute - prefs.commute.ideal;
  if (extra <= 0) gains.push({ factor: "commute", label: `${commute}-min commute`, phrase: `is a ${commute}-min commute` });
  else gives.push({ factor: "commute", label: `+${extra} min commute`, phrase: `${plural(extra, "extra minute")} of commute` });

  if (gap.total === 0) gains.push({ factor: "dates", label: "Covers every date", phrase: "covers every date" });
  if (gap.start > 0) gives.push({ factor: "dates", label: `Opens ${plural(gap.start, "day")} late`, phrase: `${plural(gap.start, "day")} at the start of your stay` });
  if (gap.end > 0) gives.push({ factor: "dates", label: `Ends ${plural(gap.end, "day")} early`, phrase: `${plural(gap.end, "day")} at the end of your stay` });

  for (const { key } of has.sort((a, b) => b.pts - a.pts)) gains.push({ factor: "facilities", label: facilityText(key).label, phrase: facilityText(key).has });
  for (const { key } of lacks.sort((a, b) => b.pts - a.pts)) gives.push({ factor: "facilities", label: facilityText(key).lacks, phrase: facilityText(key).noun });

  if (trustFactor < 1) {
    const pct = Math.round((1 - trustFactor) * 100);
    const why = listing.trustReason ?? (level === "outside" ? "Outside listing, not verified by Roomsure" : "Host not fully verified");
    gives.push({ factor: "trust", label: `${why} (−${pct}%)`, phrase: `${pct}% of the score (${why.charAt(0).toLowerCase()}${why.slice(1)})` });
  }

  // Lead with what the seeker cares about most (sort is stable, so ties keep factor order).
  // A trust penalty always comes first: it is the seeker's own switch and explains the drop.
  const rankOf = (r: Reason): number => (r.factor === "trust" ? 2 : weights[r.factor]);
  const byWeight = (a: Reason, b: Reason): number => rankOf(b) - rankOf(a);
  gains.sort(byWeight);
  gives.sort(byWeight);

  return { listing, score: Math.round(exactScore), exactScore, baseScore, trustFactor, factorScores, weights, points, uncoveredDays: gap, gains, gives };
}

/** Template explanation from the top facts. The AI explainer may smooth it, using only these facts. */
export function sentenceFor(rank: number, gains: Reason[], gives: Reason[]): string {
  const g = joinList(gains.slice(0, 3).map((r) => r.phrase));
  const v = joinList(gives.slice(0, 3).map((r) => r.phrase));
  if (g && v) return `#${rank} because it ${g}; you give up ${v}.`;
  if (g) return `#${rank} because it ${g}, with nothing to give up.`;
  if (v) return `#${rank}: it fits your limits, but you give up ${v}.`;
  return `#${rank}: it fits your limits.`;
}

/** Score, filter and sort every listing. Ties go to the cheaper listing, then the shorter commute. */
export function rankListings<L extends Listing>(prefs: Preferences, listings: L[]): RankResult<L> {
  const weights = weightsFor(prefs);
  const active = activeFactors(prefs);
  const scored: Unranked<L>[] = [];
  const filtered: FilteredListing<L>[] = [];
  for (const listing of listings) {
    const result = evaluate(listing, prefs, weights, active);
    if ("reasons" in result) filtered.push(result);
    else scored.push(result);
  }
  scored.sort((a, b) =>
    b.score - a.score ||
    a.listing.pricePerMonth - b.listing.pricePerMonth ||
    a.listing.commuteMinutes - b.listing.commuteMinutes);
  const ranked = scored.map((s, i) => ({ ...s, rank: i + 1, sentence: sentenceFor(i + 1, s.gains, s.gives) }));
  return { ranked, filtered };
}

/**
 * The swipe deck: ranked listings the seeker hasn't swiped yet, best first.
 * Ranks stay the same after swipes, so the second card still says "#2".
 * nearMisses are the filtered listings, for an "out of cards" screen.
 */
export function buildSwipeDeck<L extends Listing>(
  prefs: Preferences,
  listings: L[],
  swipedIds: Iterable<string> = [],
): { deck: ScoredListing<L>[]; nearMisses: FilteredListing<L>[] } {
  const seen = new Set(swipedIds);
  const { ranked, filtered } = rankListings(prefs, listings);
  return {
    deck: ranked.filter((r) => !seen.has(r.listing.id)),
    nearMisses: filtered.filter((f) => !seen.has(f.listing.id)),
  };
}

/** Returns new preferences with one fix applied (for "Raise your limit" buttons). */
export function applyFix(prefs: Preferences, fix: Fix): Preferences {
  const next: Preferences = structuredClone(prefs);
  if (fix.kind === "priceLimit") next.price.limit = Math.max(next.price.limit, fix.to);
  if (fix.kind === "commuteLimit") next.commute.limit = Math.max(next.commute.limit, fix.to);
  if (fix.kind === "maxUncoveredDays") next.dates.maxUncoveredDays = Math.max(next.dates.maxUncoveredDays, fix.to);
  if (fix.kind === "facilityNeed") for (const key of fix.facilities) next.facilities[key] = fix.to;
  return next;
}

/**
 * Demo commute estimate from MVP spec section 4: straight-line distance, walking up to
 * 1.5 km, transit beyond. Label the result "approx." in the UI. A routing API is better.
 */
export function estimateCommuteMinutes(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  const rad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = rad(to.lat - from.lat);
  const dLng = rad(to.lng - from.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.sin(dLng / 2) ** 2;
  const km = 2 * 6371 * Math.asin(Math.sqrt(a));
  return Math.round(km <= 1.5 ? ((km * 1.3) / 5) * 60 : 8 + ((km * 1.3) / 15) * 60);
}
