/** Demo defaults and display labels: Maya's starting preferences, destinations, facility names. */
import { FACILITY_KEYS, facilityText, type Factor, type Need, type Preferences } from "./rankListings";
import type { Destination, Session } from "./types";

/** Maya, the summer intern. These are the values the demo sentence produces. */
export const DEFAULT_PREFERENCES: Preferences = {
  price: { ideal: 900, limit: 1050 },
  commute: { ideal: 20, limit: 35 },
  dates: { start: "2027-06-01", end: "2027-08-15", maxUncoveredDays: 5 },
  facilities: { kitchen: "must", furnished: "important" },
  importance: { price: 8, commute: 6, dates: 4, facilities: 2 },
  preferVerified: true,
};

export const DEFAULT_DESTINATION: Destination = "work";

/** A fresh copy, safe to edit. */
export function defaultPreferences(): Preferences {
  return structuredClone(DEFAULT_PREFERENCES);
}

export const DESTINATIONS: Record<Destination, { label: string; short: string }> = {
  work: { label: "Work, downtown", short: "to work" },
  campus: { label: "Brown campus", short: "to campus" },
};

export const FACTOR_LABELS: Record<Factor, string> = {
  price: "Price",
  commute: "Commute",
  dates: "Dates",
  facilities: "Facilities",
};

export const NEED_ORDER: Need[] = ["none", "nice", "important", "must"];
export const NEED_LABELS: Record<Need, string> = {
  none: "Don't care",
  nice: "Nice",
  important: "Important",
  must: "Must",
};

/** Furnished, Kitchen, In-unit laundry, Gym, Private bathroom, Air conditioning, Parking. */
export const FACILITY_OPTIONS: { key: string; label: string }[] = FACILITY_KEYS.map((key) => ({ key, label: facilityText(key).label }));

export const MAYA: Session = { userId: "demo-maya", name: "Maya Chen", verified: true };

/** The sentence the demo pastes into "What do you need?". */
export const DEMO_INTAKE_SENTENCE =
  "I'm interning downtown June 1 to August 15. Budget around $900, $1,050 max. Commute ideally 20 minutes, 35 at most. I need a kitchen, furnished matters a lot, and I can live with up to 5 days' gap.";
