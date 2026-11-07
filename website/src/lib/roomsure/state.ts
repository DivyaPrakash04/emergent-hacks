import { useSyncExternalStore } from "react";
import type { DeckPreferences } from "./deck";
import { DEFAULT_DESTINATION, DEFAULT_PREFERENCES } from "./defaults";
import type { Destination, HostReply, Reservation, Session } from "./types";

export const STORAGE_KEY = "roomsure-demo-v1";

export type SwipeChoice = "interested" | "pass";

export type CheckKey = "email" | "id" | "card";

export interface RoomsureState {
  /** Simulated Passport checks. */
  checks: Record<CheckKey, boolean>;
  session: Session | null;
  preferences: DeckPreferences;
  destination: Destination;
  intakeSource: "claude" | "rules" | null;
  swipes: Record<string, SwipeChoice>;
  swipeHistory: string[];
  hostReplies: Record<string, HostReply>;
  reservations: Record<string, Reservation>;
}

export function defaultState(): RoomsureState {
  return {
    session: null,
    checks: { email: true, id: true, card: false },
    preferences: structuredClone(DEFAULT_PREFERENCES),
    destination: DEFAULT_DESTINATION,
    intakeSource: null,
    swipes: {},
    swipeHistory: [],
    hostReplies: {},
    reservations: {},
  };
}

function isValid(s: unknown): s is RoomsureState {
  if (!s || typeof s !== "object") return false;
  const o = s as Partial<RoomsureState>;
  const p = o.preferences;
  return (
    !!p && typeof p === "object" && !!p.price && !!p.commute && !!p.dates && !!p.facilities &&
    (o.destination === "work" || o.destination === "campus") &&
    typeof o.swipes === "object" && Array.isArray(o.swipeHistory) &&
    typeof o.hostReplies === "object" && typeof o.reservations === "object"
  );
}

const SERVER_STATE = defaultState();
let state: RoomsureState | null = null;
const listeners = new Set<() => void>();

function load(): RoomsureState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isValid(parsed)) return { ...defaultState(), ...parsed };
    }
  } catch {
    /* broken storage: fall through to defaults */
  }
  return defaultState();
}

function getState(): RoomsureState {
  if (state === null) state = load();
  return state;
}

export function setState(update: Partial<RoomsureState> | ((s: RoomsureState) => Partial<RoomsureState>)) {
  const current = getState();
  const patch = typeof update === "function" ? update(current) : update;
  state = { ...current, ...patch };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked: keep in memory */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useRoomsure<T>(select: (s: RoomsureState) => T): T {
  return useSyncExternalStore(subscribe, () => select(getState()), () => select(SERVER_STATE));
}

// ---------- actions ----------

export const actions = {
  setPreferences(preferences: DeckPreferences) {
    setState({ preferences });
  },
  setDestination(destination: Destination) {
    setState({ destination });
  },
  setIntake(preferences: DeckPreferences, destination: Destination, intakeSource: "claude" | "rules") {
    setState({ preferences, destination, intakeSource });
  },
  swipe(id: string, choice: SwipeChoice) {
    setState((s) => ({
      swipes: { ...s.swipes, [id]: choice },
      swipeHistory: [...s.swipeHistory.filter((x) => x !== id), id],
    }));
  },
  /** Removes the last swipe; returns its id and choice. */
  undo(): { id: string; choice: SwipeChoice } | null {
    const s = getState();
    const id = s.swipeHistory[s.swipeHistory.length - 1];
    if (!id) return null;
    const choice = s.swipes[id] ?? "pass";
    const swipes = { ...s.swipes };
    delete swipes[id];
    setState({ swipes, swipeHistory: s.swipeHistory.slice(0, -1) });
    return { id, choice };
  },
  /** Bring a passed room back into the deck. */
  unswipe(id: string) {
    setState((s) => {
      const swipes = { ...s.swipes };
      delete swipes[id];
      return { swipes, swipeHistory: s.swipeHistory.filter((x) => x !== id) };
    });
  },
  addReservation(r: Reservation) {
    setState((s) => ({ reservations: { ...s.reservations, [r.listingId]: r } }));
  },
  setHostReply(id: string, reply: HostReply) {
    setState((s) => ({ hostReplies: { ...s.hostReplies, [id]: reply } }));
  },
  completeCheck(key: CheckKey) {
    setState((s) => ({ checks: { ...s.checks, [key]: true } }));
  },
  /** Clears swipes, matches and reservations; keeps preferences and checks. */
  resetActivity() {
    setState({ swipes: {}, swipeHistory: [], hostReplies: {}, reservations: {} });
  },
  reset() {
    setState(defaultState());
  },
};
