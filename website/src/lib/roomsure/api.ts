// STAND-IN: mock API with short fake delays. Claude Code swaps this for the real backend.
import { LISTINGS } from "./data/listings";
import { parseIntakeRules } from "./intake";
import { checkListingRules } from "./check";
import type { CheckResult, HostReply, IntakeResult, Reservation, RoomListing, Session } from "./types";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Hosts that accept right away in the demo. */
const ACCEPTING_HOSTS = new Set(["fox-point", "downcity-studio"]);

export const api = {
  async demoLogin(): Promise<Session> {
    await wait(300);
    return { userId: "maya-demo", name: "Maya Chen", verified: true };
  },
  /** Offline: always uses the rules parser until the real backend calls Claude. */
  async parseIntake(text: string): Promise<IntakeResult> {
    await wait(900);
    const parsed = parseIntakeRules(text);
    return { source: "rules", summary: text.trim(), ...parsed };
  },
  /** Offline: rules checker until the real backend calls Claude. */
  async checkListing(text: string): Promise<CheckResult> {
    await wait(1400);
    return checkListingRules(text);
  },
  async getListings(): Promise<RoomListing[]> {
    await wait(250);
    return LISTINGS;
  },
  /** Simulated: resolves after a short pause. */
  async simulateHostReply(listingId: string): Promise<HostReply> {
    await wait(1400);
    return ACCEPTING_HOSTS.has(listingId) ? "accepted" : "reviewing";
  },
  async reserve(listingId: string): Promise<Reservation> {
    await wait(600);
    const l = LISTINGS.find((x) => x.id === listingId);
    if (!l) throw new Error("That room isn't available anymore.");
    return {
      listingId,
      amount: l.pricePerMonth,
      confirmation: "RS-" + listingId.slice(0, 3).toUpperCase() + "-0601",
      createdAt: new Date().toISOString(),
      simulated: true,
    };
  },
  async resetDemo(): Promise<void> {
    await wait(150);
  },
};
