import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type Stripe from "stripe";
const folder = mkdtempSync(join(tmpdir(), "roomsure-test-"));
process.env.DATABASE_PATH = join(folder, "test.sqlite");
process.env.PROVIDER_MODE = "demo";
const { db, userById } = await import("../lib/db");
const { passwordHash, passwordMatches, verified, originGuard, rateLimit } =
  await import("../lib/auth");
const { sendCode, verifyCode, stripe } = await import("../lib/providers");
const { processEvent } = await import("../lib/webhook");
const seed = (id: string, role = "seeker") => {
  db.prepare(
    "INSERT INTO users(id,name,email,password,role,created_at) VALUES(?,?,?,?,?,?)",
  ).run(id, "Maya", `${id}@example.com`, "unused", role, Date.now());
  return userById(id)!;
};
after(() => {
  db.close();
  rmSync(folder, { recursive: true, force: true });
});
test("passwords use salted scrypt, and reject incorrect credentials", async () => {
  const a = await passwordHash("a long sample password");
  const b = await passwordHash("a long sample password");
  assert.notEqual(a, b);
  assert(await passwordMatches("a long sample password", a));
  assert(!(await passwordMatches("incorrect password", a)));
});
test("email challenges expire, lock after five failures, and are single use", async () => {
  const u = seed("email");
  const code = await sendCode(u);
  assert(code);
  for (let i = 0; i < 5; i++) assert.throws(() => verifyCode(u, "000000"));
  assert.throws(() => verifyCode(u, code));
  db.prepare("DELETE FROM codes WHERE user_id=?").run(u.id);
  const next = await sendCode(u);
  db.prepare("UPDATE codes SET expires=0 WHERE user_id=?").run(u.id);
  assert.throws(() => verifyCode(u, next!));
  db.prepare("DELETE FROM codes WHERE user_id=?").run(u.id);
  const final = await sendCode(u);
  verifyCode(u, final!);
  assert.equal(userById(u.id)!.email_verified, 1);
  assert.throws(() => verifyCode(u, final!));
});
test("verification requires every check and host consent", () => {
  const u = seed("host", "host");
  assert(!verified(u));
  u.email_verified = 1;
  u.identity_status = "verified";
  u.card_status = "verified";
  assert(!verified(u));
  u.consent = 1;
  assert(verified(u));
  u.identity_status = "needs_input";
  assert(!verified(u));
});
test("origin enforcement and persistent rate limit reject bad requests", () => {
  assert.throws(() =>
    originGuard(
      new Request("http://localhost:3000", {
        headers: { origin: "https://evil.example" },
      }),
    ),
  );
  originGuard(
    new Request("http://localhost:3000", {
      headers: { origin: "http://localhost:3000" },
    }),
  );
  rateLimit("sample", 2);
  rateLimit("sample", 2);
  assert.throws(() => rateLimit("sample", 2));
});
test("one reservation cannot be charged twice", () => {
  const u = seed("payment");
  db.prepare("INSERT INTO payments VALUES(?,?,95000,'paid',NULL,?)").run(
    "p1",
    u.id,
    Date.now(),
  );
  assert.throws(() =>
    db
      .prepare("INSERT INTO payments VALUES(?,?,95000,'pending',NULL,?)")
      .run("p2", u.id, Date.now()),
  );
});
test("signed webhooks reject tampering and live keys", () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_fake";
  const client = stripe();
  const payload = JSON.stringify({ id: "evt_test", object: "event" });
  const signature = client.webhooks.generateTestHeaderString({
    payload,
    secret: "whsec_test",
  });
  assert.equal(
    client.webhooks.constructEvent(payload, signature, "whsec_test").id,
    "evt_test",
  );
  assert.throws(() =>
    client.webhooks.constructEvent(payload + " ", signature, "whsec_test"),
  );
  process.env.STRIPE_SECRET_KEY = "sk_live_disabled";
  assert.throws(() => stripe());
  delete process.env.STRIPE_SECRET_KEY;
});
test("payment webhooks use canonical provider state, enforce ownership, and deduplicate", async () => {
  const u = seed("webhook");
  db.prepare("UPDATE users SET customer_id=? WHERE id=?").run(
    "cus_owner",
    u.id,
  );
  db.prepare("INSERT INTO payments VALUES(?,?,95000,'pending',?,?)").run(
    "webhook-payment",
    u.id,
    "cs_owned",
    Date.now(),
  );
  const event = {
    id: "evt_paid",
    type: "checkout.session.completed",
    livemode: false,
    data: { object: { id: "cs_owned" } },
  } as Stripe.Event;
  const session = {
    id: "cs_owned",
    customer: "cus_owner",
    client_reference_id: u.id,
    amount_total: 95000,
    currency: "usd",
    mode: "payment",
    status: "complete",
    payment_status: "unpaid",
  };
  const client = {
    checkout: { sessions: { retrieve: async () => session } },
  } as unknown as Stripe;
  await processEvent(event, client);
  assert.equal(
    (
      db
        .prepare("SELECT status FROM payments WHERE id=?")
        .get("webhook-payment") as { status: string }
    ).status,
    "pending",
  );
  session.payment_status = "paid";
  session.amount_total = 1;
  await assert.rejects(
    processEvent({ ...event, id: "evt_bad_amount" }, client),
  );
  session.amount_total = 95000;
  session.customer = "cus_other";
  await assert.rejects(processEvent({ ...event, id: "evt_bad_owner" }, client));
  session.customer = "cus_owner";
  await processEvent({ ...event, id: "evt_confirmed" }, client);
  assert.equal(
    (
      db
        .prepare("SELECT status FROM payments WHERE id=?")
        .get("webhook-payment") as { status: string }
    ).status,
    "paid",
  );
  await processEvent({ ...event, id: "evt_confirmed" }, client);
  assert.equal(
    (
      db
        .prepare(
          "SELECT count(*) AS count FROM activity WHERE user_id=? AND message='Test reservation payment received'",
        )
        .get(u.id) as { count: number }
    ).count,
    1,
  );
  await assert.rejects(
    processEvent({ ...event, id: "evt_live", livemode: true }, client),
  );
});

test("demo records cannot cross into Stripe mode", async () => {
  const { providerMode } = await import("../lib/auth");
  assert.equal(providerMode(), "demo");
  process.env.PROVIDER_MODE = "stripe";
  assert.throws(() => providerMode(), /another provider mode/);
  process.env.PROVIDER_MODE = "demo";
});

test("card and identity webhooks derive completion from retrieved provider objects", async () => {
  const u = seed("checks");
  db.prepare("UPDATE users SET customer_id=? WHERE id=?").run(
    "cus_checks",
    u.id,
  );
  db.prepare("INSERT INTO flows VALUES(?,?,'identity',?,'pending',?)").run(
    "identity-flow",
    u.id,
    "vs_test",
    Date.now(),
  );
  db.prepare("INSERT INTO flows VALUES(?,?,'card',?,'pending',?)").run(
    "card-flow",
    u.id,
    "cs_setup",
    Date.now(),
  );
  const client = {
    identity: {
      verificationSessions: {
        retrieve: async () => ({ id: "vs_test", status: "verified" }),
      },
    },
    checkout: {
      sessions: {
        retrieve: async () => ({
          id: "cs_setup",
          mode: "setup",
          status: "complete",
          customer: "cus_checks",
          client_reference_id: u.id,
          setup_intent: {
            status: "succeeded",
            payment_method: { card: { last4: "1234" } },
          },
        }),
      },
    },
  } as unknown as Stripe;
  await processEvent(
    {
      id: "evt_identity",
      type: "identity.verification_session.verified",
      livemode: false,
      data: { object: { id: "vs_test" } },
    } as Stripe.Event,
    client,
  );
  await processEvent(
    {
      id: "evt_setup",
      type: "checkout.session.completed",
      livemode: false,
      data: { object: { id: "cs_setup" } },
    } as Stripe.Event,
    client,
  );
  assert.equal(userById(u.id)!.identity_status, "verified");
  assert.equal(userById(u.id)!.card_status, "verified");
  assert.equal(userById(u.id)!.card_last4, "1234");
});
