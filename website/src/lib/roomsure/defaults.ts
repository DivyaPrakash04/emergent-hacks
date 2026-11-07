// STAND-IN: written in Lovable until Claude Code pushes the real brain files. Safe to replace.
import type { DeckPreferences } from "./deck";
import type { Destination } from "./types";
export { facilityText, FACILITY_KEYS } from "./rankListings";

/** Maya Chen: summer intern in Providence, June 1 to August 15, working downtown. */
export const DEFAULT_PREFERENCES: DeckPreferences = {
  price: { ideal: 900, limit: 1050 },
  commute: { ideal: 20, limit: 35 },
  dates: { start: "2027-06-01", end: "2027-08-15", maxUncoveredDays: 5 },
  facilities: { furnished: "important", kitchen: "must" },
  importance: { price: 5, commute: 4, dates: 2, facilities: 2 },
  preferVerified: true,
};

export const DEFAULT_DESTINATION: Destination = "work";

export const DESTINATION_LABEL: Record<Destination, string> = {
  work: "work",
  campus: "campus",
};
