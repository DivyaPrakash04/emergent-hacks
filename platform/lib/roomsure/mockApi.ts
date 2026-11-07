/**
 * Mock API for the Lovable UI. Same function names and shapes as the real API that
 * replaces it in platform/, with short fake delays so loading states show. Synced
 * into the Lovable repo as src/lib/roomsure/api.ts.
 * Everything here is simulated: no network, no AI, no money.
 */
import { getListing, LISTINGS } from "./data/listings";
import { MAYA } from "./defaults";
import { parseIntakeRules } from "./intake";
import { checkListingRules } from "./scam";
import type { CheckResult, IntakeResult, Reservation, RoomListing, Session } from "./types";

let delayScale = 1;
/** Tests set this to 0. */
export function setMockDelayScale(scale: number): void {
  delayScale = scale;
}
const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms * delayScale));

/** "Continue as Maya (demo)". */
export async function demoLogin(): Promise<Session> {
  await wait(400);
  return { ...MAYA };
}

/** Every room the seeker may see. Suspended listings are never returned. */
export async function getListings(): Promise<RoomListing[]> {
  await wait(250);
  return LISTINGS.filter((l) => l.trustStatus !== "suspended");
}

export async function getListingById(id: string): Promise<RoomListing | null> {
  await wait(150);
  const room = getListing(id);
  return room && room.trustStatus !== "suspended" ? room : null;
}

/** The mock always uses the offline rules, so it honestly reports source "rules". */
export async function parseIntake(text: string): Promise<IntakeResult> {
  await wait(900);
  return parseIntakeRules(text);
}

export async function checkListing(text: string): Promise<CheckResult> {
  await wait(1100);
  if (!text.trim()) throw new Error("Paste a listing first.");
  return checkListingRules(text.slice(0, 5000));
}

/** Simulated host reply after the seeker swipes Interested. */
export async function simulateHostReply(listingId: string): Promise<"accepted" | "reviewing"> {
  await wait(1500);
  return getListing(listingId)?.demoHostReply === "accept" ? "accepted" : "reviewing";
}

/** Simulated reservation of the first month. The amount comes from the listing, never the UI. */
export async function reserve(listingId: string): Promise<Reservation> {
  await wait(800);
  const room = getListing(listingId);
  if (!room || room.trustStatus === "suspended") throw new Error("This room can't be reserved.");
  return {
    id: "res_" + Math.random().toString(36).slice(2, 10),
    listingId,
    amount: room.pricePerMonth,
    createdAt: new Date().toISOString(),
    simulated: true,
  };
}

/** Clears server-side demo data. The UI also clears its own state. */
export async function resetDemo(): Promise<void> {
  await wait(200);
}
