// The one place screens get data from (see AGENTS.md rule 2).
// Real backend first (platform/, through /api): demo login, Claude intake, Claude
// scam check, and simulated reservations stored server-side. If no backend answers
// (Lovable preview, backend not running), each call falls back to the local mock
// below, so the screens always work. Rooms, ranking and host replies stay local.
import { LISTINGS } from "./data/listings";
import { parseIntakeRules } from "./intake";
import { checkListingRules } from "./check";
import {
  callBackend,
  ensureBackendSession,
  reserveOnBackend,
  toWebsiteCheck,
  toWebsiteIntake,
  withFallback,
  type BackendCheck,
  type BackendIntake,
} from "./backend";
import type { CheckResult, HostReply, IntakeResult, Reservation, RoomListing, Session } from "./types";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Hosts that accept right away in the demo. */
const ACCEPTING_HOSTS = new Set(["fox-point", "downcity-studio"]);

/** Local stand-ins, used only when no backend answers. */
const mock = {
  async demoLogin(): Promise<Session> {
    await wait(300);
    return { userId: "maya-demo", name: "Maya Chen", verified: true };
  },
  async parseIntake(text: string): Promise<IntakeResult> {
    await wait(900);
    const parsed = parseIntakeRules(text);
    return { source: "rules", summary: text.trim(), ...parsed };
  },
  async checkListing(text: string): Promise<CheckResult> {
    await wait(1400);
    return checkListingRules(text);
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

export const api = {
  async demoLogin(): Promise<Session> {
    return withFallback(async () => {
      const me = await ensureBackendSession();
      return { userId: "demo-maya", name: me.user?.name ?? "Maya Chen", verified: !!me.user?.verified };
    }, mock.demoLogin);
  },
  /** Claude reads the sentence on the server; the result says "claude" or "rules". */
  async parseIntake(text: string): Promise<IntakeResult> {
    return withFallback(
      async () => toWebsiteIntake(text, await callBackend<BackendIntake>("intake", { text })),
      () => mock.parseIntake(text),
    );
  },
  /** Claude suggests quotes on the server; code keeps only exact ones and sets the verdict. */
  async checkListing(text: string): Promise<CheckResult> {
    return withFallback(
      async () => toWebsiteCheck(await callBackend<BackendCheck>("check", { text })),
      () => mock.checkListing(text),
    );
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
  /** Simulated payment recorded on the server, priced from the room id (never from the browser). */
  async reserve(listingId: string): Promise<Reservation> {
    return withFallback(() => reserveOnBackend(listingId), () => mock.reserve(listingId));
  },
  async resetDemo(): Promise<void> {
    return withFallback(async () => {
      await ensureBackendSession();
      await callBackend("demo/reset", {});
    }, mock.resetDemo);
  },
};
