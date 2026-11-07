import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
const file = resolve(
  /* turbopackIgnore: true */ process.env.DATABASE_PATH ||
    ".data/roomsure.sqlite",
);
mkdirSync(dirname(file), { recursive: true });
const globalDb = globalThis as unknown as { roomsureDb?: DatabaseSync };
export const db = globalDb.roomsureDb || new DatabaseSync(file);
globalDb.roomsureDb = db;
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
 role TEXT NOT NULL, email_verified INTEGER DEFAULT 0, identity_status TEXT DEFAULT 'unverified',
 card_status TEXT DEFAULT 'unverified', card_last4 TEXT, customer_id TEXT, consent INTEGER DEFAULT 0,
 created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS codes (user_id TEXT PRIMARY KEY REFERENCES users(id), hash TEXT NOT NULL, expires INTEGER NOT NULL, attempts INTEGER DEFAULT 0, sent_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, until_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS flows (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), kind TEXT NOT NULL, provider_id TEXT UNIQUE, status TEXT NOT NULL DEFAULT 'pending', created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), amount INTEGER NOT NULL, status TEXT NOT NULL, provider_id TEXT UNIQUE, created_at INTEGER NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS active_payment ON payments(user_id) WHERE status IN ('pending','paid');
CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS activity (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id), message TEXT NOT NULL, created_at INTEGER NOT NULL);
`);
export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "seeker" | "host";
  email_verified: number;
  identity_status: string;
  card_status: string;
  card_last4: string | null;
  customer_id: string | null;
  consent: number;
  created_at: number;
};
export function userById(id: string) {
  return db.prepare("SELECT * FROM users WHERE id=?").get(id) as
    User | undefined;
}
export function log(userId: string, message: string) {
  db.prepare(
    "INSERT INTO activity(user_id,message,created_at) VALUES(?,?,?)",
  ).run(userId, message, Date.now());
}
export function transaction<T>(work: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = work();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
