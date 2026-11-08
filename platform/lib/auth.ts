import {
  randomBytes,
  createHash,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { db, transaction, userById, type User } from "./db";
const scrypt = promisify(scryptCallback);
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}
export async function passwordMatches(password: string, encoded: string) {
  const [salt, key] = encoded.split(":");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(key, "hex");
  return (
    derived.length === expected.length && timingSafeEqual(derived, expected)
  );
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const appUrl = () =>
  (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
export async function providerMode() {
  const mode = process.env.PROVIDER_MODE || "demo";
  if (!["demo", "stripe"].includes(mode))
    throw new HttpError(503, "Invalid provider configuration.");
  if (process.env.NODE_ENV === "production" && !process.env.PROVIDER_MODE)
    throw new HttpError(503, "Set PROVIDER_MODE explicitly before deployment.");
  await db.prepare(
    "INSERT OR IGNORE INTO settings(key,value) VALUES('provider_mode',?)",
  ).run(mode);
  const configured = (await db
    .prepare("SELECT value FROM settings WHERE key='provider_mode'")
    .get()) as { value: string };
  if (configured.value !== mode)
    throw new HttpError(
      503,
      "This database belongs to another provider mode. Use a separate database before switching modes.",
    );
  return mode as "demo" | "stripe";
}
export function originGuard(request: Request) {
  if (request.headers.get("origin") !== new URL(appUrl()).origin)
    throw new HttpError(403, "This request must come from Roomsure.");
}
export async function rateLimit(key: string, max = 10, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const row = (await db.prepare(
    `INSERT INTO limits(key,count,until_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN until_at<? THEN 1 ELSE count+1 END, until_at=CASE WHEN until_at<? THEN excluded.until_at ELSE until_at END RETURNING count`,
  ).get(hash(key), now + windowMs, now, now)) as { count: number };
  if (row.count > max)
    throw new HttpError(429, "Too many attempts. Please try again later.");
}
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expires = Date.now() + 7 * 24 * 60 * 60 * 1000;
  await db.prepare("DELETE FROM sessions WHERE expires<?").run(Date.now());
  await db.prepare("INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)").run(
    hash(token),
    userId,
    expires,
  );
  (await cookies()).set("roomsure_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: appUrl().startsWith("https:"),
    path: "/",
    expires: new Date(expires),
  });
}
export async function currentUser() {
  const token = (await cookies()).get("roomsure_session")?.value;
  if (!token) return null;
  const session = (await db
    .prepare("SELECT user_id FROM sessions WHERE token=? AND expires>?")
    .get(hash(token), Date.now())) as { user_id: string } | undefined;
  return session ? (await userById(session.user_id)) || null : null;
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Sign in to continue.");
  return user;
}
export function verified(user: User) {
  return (
    !!user.email_verified &&
    user.identity_status === "verified" &&
    user.card_status === "verified" &&
    (user.role !== "host" || !!user.consent)
  );
}
export function requireEmail(user: User) {
  if (!user.email_verified)
    throw new HttpError(403, "Verify your email first.");
}
export async function logout() {
  const jar = await cookies();
  const token = jar.get("roomsure_session")?.value;
  if (token) await db.prepare("DELETE FROM sessions WHERE token=?").run(hash(token));
  jar.delete("roomsure_session");
}
