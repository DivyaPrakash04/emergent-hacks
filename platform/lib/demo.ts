/**
 * Demo-mode helpers: the always-ready demo accounts and the room a reservation
 * is for. Demo accounts exist only in PROVIDER_MODE=demo; they are recreated on
 * every server start, so the live demo survives Vercel wiping its /tmp database.
 */
import { randomBytes } from "node:crypto";
import { db } from "./db";
import { HttpError, passwordHash, providerMode } from "./auth";
import { getListing } from "./roomsure/data/listings";
import { WEBSITE_ROOMS } from "./roomsure/data/website-rooms";

export const DEMO_SEEKER_ID = "demo-maya";
export const DEMO_HOST_ID = "demo-host";
/** The room PR #2's original checkout was for; used when no listing is named. */
export const DEFAULT_RESERVATION_LISTING = "fox-point-sunny";

const DEMO_ACCOUNTS = [
  { id: DEMO_SEEKER_ID, name: "Maya Chen", email: "maya@demo.roomsure.example", role: "seeker", consent: 0 },
  { id: DEMO_HOST_ID, name: "Lena K.", email: "lena@demo.roomsure.example", role: "host", consent: 1 },
] as const;

let ensured: Promise<void> | null = null;

/**
 * Create the demo accounts if missing and make sure they are fully verified
 * (simulated email, ID and card checks). No-op outside demo mode. Their
 * passwords are random and never shown: demo accounts sign in only through
 * POST /api/demo/login.
 */
export function ensureDemoAccounts(): Promise<void> {
  if (providerMode() !== "demo") return Promise.resolve();
  ensured ??= (async () => {
    for (const a of DEMO_ACCOUNTS) {
      const exists = db.prepare("SELECT id FROM users WHERE id=?").get(a.id);
      if (!exists) {
        const password = await passwordHash(randomBytes(32).toString("hex"));
        db.prepare(
          "INSERT OR IGNORE INTO users(id,name,email,password,role,created_at) VALUES(?,?,?,?,?,?)",
        ).run(a.id, a.name, a.email, password, a.role, Date.now());
      }
      db.prepare(
        "UPDATE users SET email_verified=1, identity_status='verified', card_status='verified', card_last4='4242', consent=? WHERE id=?",
      ).run(a.consent, a.id);
    }
  })().catch((error) => {
    ensured = null; // retry on the next request
    throw error;
  });
  return ensured;
}

export interface Reservation {
  listingId: string;
  title: string;
  /** US cents, from the server-side listing data. Never from the client. */
  amountCents: number;
}

/** The room a reservation is for. The price always comes from server-side listing data. */
export function reservationFor(listingId: unknown): Reservation {
  const id = typeof listingId === "string" && listingId.trim() ? listingId.trim().slice(0, 100) : DEFAULT_RESERVATION_LISTING;
  if (id.startsWith("website/")) {
    const web = WEBSITE_ROOMS[id.slice("website/".length)];
    if (!web) throw new HttpError(404, "This room can't be reserved.");
    return { listingId: id, title: web.title, amountCents: web.price * 100 };
  }
  const room = getListing(id);
  if (!room || room.trustStatus === "suspended") throw new HttpError(404, "This room can't be reserved.");
  return { listingId: room.id, title: room.title, amountCents: room.pricePerMonth * 100 };
}
