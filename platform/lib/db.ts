import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createClient } from "@tursodatabase/serverless/compat";

type BindValue = null | string | number | bigint | Uint8Array;
type Executor = {
  get: (sql: string, args: BindValue[]) => Promise<unknown>;
  all: (sql: string, args: BindValue[]) => Promise<unknown[]>;
  run: (sql: string, args: BindValue[]) => Promise<unknown>;
};
type ResultSet = {
  columns: string[];
  rows: Array<Record<string, unknown>>;
};
type StatementApi = {
  get: (...args: BindValue[]) => Promise<unknown>;
  all: (...args: BindValue[]) => Promise<unknown[]>;
  run: (...args: BindValue[]) => Promise<unknown>;
};
export type DatabaseHandle = {
  prepare: (sql: string) => StatementApi;
};

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!!url !== !!authToken)
  throw new Error("Set both TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.");
if (process.env.TURSO_REQUIRED === "true" && !url)
  throw new Error("Configure Turso before starting the production backend.");

const turso = url && authToken ? createClient({ url, authToken }) : null;
let local: DatabaseSync | null = null;
let localQueue: Promise<void> = Promise.resolve();
if (!turso) {
  const file = resolve(
    /* turbopackIgnore: true */ process.env.DATABASE_PATH ||
      ".data/roomsure.sqlite",
  );
  mkdirSync(dirname(file), { recursive: true });
  local = new DatabaseSync(file);
  local.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;");
}

const schema = [
  "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
    role TEXT NOT NULL, email_verified INTEGER DEFAULT 0, identity_status TEXT DEFAULT 'unverified',
    card_status TEXT DEFAULT 'unverified', card_last4 TEXT, customer_id TEXT, consent INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  "CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS codes (user_id TEXT PRIMARY KEY REFERENCES users(id), hash TEXT NOT NULL, expires INTEGER NOT NULL, attempts INTEGER DEFAULT 0, sent_at INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, until_at INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS flows (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), kind TEXT NOT NULL, provider_id TEXT UNIQUE, status TEXT NOT NULL DEFAULT 'pending', created_at INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), amount INTEGER NOT NULL, status TEXT NOT NULL, provider_id TEXT UNIQUE, created_at INTEGER NOT NULL, listing_id TEXT)",
  "CREATE UNIQUE INDEX IF NOT EXISTS active_payment ON payments(user_id) WHERE status IN ('pending','paid')",
  "CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, created_at INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS activity (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id), message TEXT NOT NULL, created_at INTEGER NOT NULL)",
];

let ready: Promise<void> | null = null;
async function withLocalLock<T>(work: () => T | Promise<T>): Promise<T> {
  const previous = localQueue;
  let release!: () => void;
  localQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await work();
  } finally {
    release();
  }
}

function createHandle(executor: Executor): DatabaseHandle {
  return {
    prepare(sql) {
      return {
        async get(...args) {
          return executor.get(sql, args);
        },
        async all(...args) {
          return executor.all(sql, args);
        },
        async run(...args) {
          return executor.run(sql, args);
        },
      };
    },
  };
}

async function initialize() {
  if (turso) {
    await turso.batch(schema, "write");
    try {
      await turso.execute("ALTER TABLE payments ADD COLUMN listing_id TEXT");
    } catch (error) {
      if (!String(error).toLowerCase().includes("duplicate column")) throw error;
    }
  } else {
    local!.exec(schema.join(";\n") + ";");
    const columns = local!.prepare("PRAGMA table_info(payments)").all() as {
      name: string;
    }[];
    if (!columns.some((column) => column.name === "listing_id"))
      local!.exec("ALTER TABLE payments ADD COLUMN listing_id TEXT");
  }
}

function plainRows(result: ResultSet) {
  return result.rows.map((row) =>
    Object.fromEntries(result.columns.map((column) => [column, row[column]])),
  );
}

async function ensureReady() {
  ready ??= initialize().catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}

const remoteExecutor: Executor = {
  async get(sql, args) {
    if (!turso) throw new Error("Turso is not configured.");
    const result = await turso.execute({ sql, args });
    return plainRows(result)[0];
  },
  async all(sql, args) {
    if (!turso) throw new Error("Turso is not configured.");
    return plainRows(await turso.execute({ sql, args }));
  },
  async run(sql, args) {
    if (!turso) throw new Error("Turso is not configured.");
    return turso.execute({ sql, args });
  },
};
const localExecutor: Executor = {
  async get(sql, args) {
    return local!.prepare(sql).get(...args);
  },
  async all(sql, args) {
    return local!.prepare(sql).all(...args);
  },
  async run(sql, args) {
    return local!.prepare(sql).run(...args);
  },
};
const lockedLocalExecutor: Executor = {
  get: (sql, args) => withLocalLock(() => localExecutor.get(sql, args)),
  all: (sql, args) => withLocalLock(() => localExecutor.all(sql, args)),
  run: (sql, args) => withLocalLock(() => localExecutor.run(sql, args)),
};
const readyExecutor: Executor = {
  async get(sql, args) {
    await ensureReady();
    return (turso ? remoteExecutor : lockedLocalExecutor).get(sql, args);
  },
  async all(sql, args) {
    await ensureReady();
    return (turso ? remoteExecutor : lockedLocalExecutor).all(sql, args);
  },
  async run(sql, args) {
    await ensureReady();
    return (turso ? remoteExecutor : lockedLocalExecutor).run(sql, args);
  },
};

export async function closeDatabase() {
  if (local) local.close();
  else if (turso) await turso.close();
}
export const db = Object.assign(createHandle(readyExecutor), {
  close: closeDatabase,
});

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

export async function userById(id: string) {
  return (await db.prepare("SELECT * FROM users WHERE id=?").get(id)) as
    | User
    | undefined;
}

export async function log(userId: string, message: string) {
  await db
    .prepare("INSERT INTO activity(user_id,message,created_at) VALUES(?,?,?)")
    .run(userId, message, Date.now());
}

export async function transaction<T>(
  work: (tx: DatabaseHandle) => Promise<T> | T,
): Promise<T> {
  await ensureReady();
  if (turso) {
    const tx = await turso.transaction("write");
    const handle = createHandle({
      async get(sql, args) {
        const result = await tx.execute({ sql, args });
        return plainRows(result)[0];
      },
      async all(sql, args) {
        return plainRows(await tx.execute({ sql, args }));
      },
      async run(sql, args) {
        return tx.execute({ sql, args }) as Promise<unknown>;
      },
    });
    try {
      const result = await work(handle);
      await tx.commit();
      return result;
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }

  return withLocalLock(async () => {
    local!.exec("BEGIN IMMEDIATE");
    const handle = createHandle(localExecutor);
    try {
      const result = await work(handle);
      local!.exec("COMMIT");
      return result;
    } catch (error) {
      local!.exec("ROLLBACK");
      throw error;
    }
  });
}
