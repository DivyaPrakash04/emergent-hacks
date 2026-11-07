/**
 * Demo fair-price estimate (MVP requirements section 5). A comparison aid only:
 * it never changes the ranking score, and every label says "demo estimate".
 */
import type { FairPriceResult } from "./types";

/**
 * Synthetic monthly midpoints for an unfurnished private room, by neighborhood.
 * Demo values for the hackathon, not market data.
 */
export const FAIR_BASELINES: Record<string, { label: string; mid: number }> = {
  "fox-point": { label: "Fox Point", mid: 840 },
  downcity: { label: "Downcity", mid: 880 },
  "federal-hill": { label: "Federal Hill", mid: 760 },
  "smith-hill": { label: "Smith Hill", mid: 700 },
  "west-end": { label: "West End", mid: 720 },
  armory: { label: "Armory", mid: 760 },
  "wayland-square": { label: "Wayland Square", mid: 900 },
  olneyville: { label: "Olneyville", mid: 650 },
  "college-hill": { label: "College Hill", mid: 860 },
  elmhurst: { label: "Elmhurst", mid: 680 },
  "mount-pleasant": { label: "Mount Pleasant", mid: 690 },
  "jewelry-district": { label: "Jewelry District", mid: 850 },
};

/** Lower-case words in pasted text that map to a baseline key. */
export const NEIGHBORHOOD_ALIASES: Record<string, string> = {
  "fox point": "fox-point",
  wickenden: "fox-point",
  downcity: "downcity",
  downtown: "downcity",
  "federal hill": "federal-hill",
  "smith hill": "smith-hill",
  "west end": "west-end",
  armory: "armory",
  "wayland square": "wayland-square",
  olneyville: "olneyville",
  "college hill": "college-hill",
  "thayer": "college-hill",
  elmhurst: "elmhurst",
  "mount pleasant": "mount-pleasant",
  "jewelry district": "jewelry-district",
};

export interface FairPriceInput {
  baselineKey: string | null;
  roomType: "private" | "shared" | null;
  price: number | null;
  furnished?: boolean;
  privateBath?: boolean;
  /** Length of the seeker's stay; under ~3 months adds 5%. Omit when unknown. */
  stayDays?: number;
}

const money = (n: number): string => "$" + Math.round(n).toLocaleString("en-US");

/** null = "Estimate unavailable" (unknown neighborhood, unknown or shared room type, or no price). */
export function estimateFairPrice(input: FairPriceInput): FairPriceResult | null {
  const base = input.baselineKey ? FAIR_BASELINES[input.baselineKey] : undefined;
  if (!base || input.roomType !== "private" || input.price == null) return null;
  let mid = base.mid;
  if (input.furnished) mid *= 1.1;
  if (input.privateBath) mid *= 1.1;
  if (input.stayDays !== undefined && input.stayDays < 91) mid *= 1.05;
  const low = Math.round(mid * 0.88);
  const high = Math.round(mid * 1.12);
  const price = input.price;
  const range = `${money(low)}–${money(high)}`;
  if (price > high) {
    const percentAbove = Math.round(((price - high) / high) * 100);
    return { low, high, mid: Math.round(mid), kind: "above", percentAbove, label: `About ${Math.max(1, percentAbove)}% above the ${range} range · demo estimate` };
  }
  if (price >= low) return { low, high, mid: Math.round(mid), kind: "fair", label: "Fair price · demo estimate" };
  if (price >= low * 0.7) return { low, high, mid: Math.round(mid), kind: "good_deal", label: "Good deal · demo estimate" };
  return { low, high, mid: Math.round(mid), kind: "unusually_low", label: "Unusually low · demo estimate" };
}
