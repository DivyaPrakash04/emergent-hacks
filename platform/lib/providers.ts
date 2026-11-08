import Stripe from "stripe";
import { randomInt, randomUUID } from "node:crypto";
import { db, transaction, type User } from "./db";
import { appUrl, hash, HttpError, providerMode } from "./auth";
export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith("sk_test_"))
    throw new HttpError(
      503,
      "Stripe test keys are not configured. Live payments are disabled.",
    );
  return new Stripe(key);
}
export async function sendCode(user: User) {
  const existing = (await db
    .prepare("SELECT sent_at FROM codes WHERE user_id=?")
    .get(user.id)) as { sent_at: number } | undefined;
  if (existing && existing.sent_at > Date.now() - 60000)
    throw new HttpError(429, "Wait a minute before requesting another code.");
  const code = String(randomInt(100000, 1000000));
  if ((await providerMode()) === "stripe") {
    if (!process.env.RESEND_API_KEY)
      throw new HttpError(503, "Email delivery is not configured.");
    const result = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [user.email],
        subject: "Your Roomsure verification code",
        text: `Your Roomsure code is ${code}. It expires in 10 minutes. If you did not request it, ignore this email.`,
      }),
    });
    if (!result.ok)
      throw new HttpError(
        502,
        "Could not deliver the email. Please try again.",
      );
  }
  await db.prepare(
    "INSERT INTO codes(user_id,hash,expires,attempts,sent_at) VALUES(?,?,?,0,?) ON CONFLICT(user_id) DO UPDATE SET hash=excluded.hash,expires=excluded.expires,attempts=0,sent_at=excluded.sent_at",
  ).run(user.id, hash(`${user.id}:${code}`), Date.now() + 600000, Date.now());
  return (await providerMode()) === "demo" ? code : undefined;
}
export async function verifyCode(user: User, code: string) {
  const outcome = await transaction(async (tx) => {
    const row = (await tx.prepare("SELECT * FROM codes WHERE user_id=?").get(user.id)) as
      { hash: string; expires: number; attempts: number } | undefined;
    if (!row || row.expires < Date.now() || row.attempts >= 5) return "expired";
    await tx.prepare("UPDATE codes SET attempts=attempts+1 WHERE user_id=?").run(
      user.id,
    );
    if (row.hash !== hash(`${user.id}:${code}`)) return "incorrect";
    await tx.prepare("UPDATE users SET email_verified=1 WHERE id=?").run(user.id);
    await tx.prepare("DELETE FROM codes WHERE user_id=?").run(user.id);
    await tx.prepare(
      "INSERT INTO activity(user_id,message,created_at) VALUES(?,?,?)",
    ).run(user.id, "Email address verified", Date.now());
    return "verified";
  });
  if (outcome === "expired")
    throw new HttpError(400, "Code expired or locked. Request a new code.");
  if (outcome === "incorrect")
    throw new HttpError(400, "That code is incorrect.");
}
export async function customer(user: User) {
  if (user.customer_id) return user.customer_id;
  const value = await stripe().customers.create(
    { email: user.email, name: user.name, metadata: { userId: user.id } },
    { idempotencyKey: `customer:${user.id}` },
  );
  await db.prepare("UPDATE users SET customer_id=? WHERE id=?").run(
    value.id,
    user.id,
  );
  return value.id;
}
export async function startIdentity(user: User) {
  const client = stripe();
  const previous = (await db
    .prepare(
      "SELECT * FROM flows WHERE user_id=? AND kind='identity' AND status='pending' ORDER BY created_at DESC LIMIT 1",
    )
    .get(user.id)) as { id: string; provider_id: string | null } | undefined;
  const id = previous?.id || randomUUID();
  if (!previous)
    await db.prepare(
      "INSERT INTO flows(id,user_id,kind,created_at) VALUES(?,?,'identity',?)",
    ).run(id, user.id, Date.now());
  const session = previous?.provider_id
    ? await client.identity.verificationSessions.retrieve(previous.provider_id)
    : await client.identity.verificationSessions.create(
        {
          type: "document",
          provided_details: { email: user.email },
          options: { document: { require_matching_selfie: true } },
          metadata: { userId: user.id, flowId: id },
          return_url: `${appUrl()}/?returned=identity`,
        },
        { idempotencyKey: id },
      );
  await db.prepare("UPDATE flows SET provider_id=? WHERE id=?").run(session.id, id);
  if (session.status === "verified")
    throw new HttpError(
      409,
      "Verification is being confirmed. Refresh in a moment.",
    );
  if (session.status === "canceled") {
    await db.prepare("UPDATE flows SET status='canceled' WHERE id=?").run(id);
    throw new HttpError(409, "Previous verification canceled. Please retry.");
  }
  await db.prepare("UPDATE users SET identity_status='pending' WHERE id=?").run(
    user.id,
  );
  return session.url;
}
export async function startCheckout(
  user: User,
  kind: "card" | "payment",
  room: { listingId: string; title: string; amountCents: number } = { listingId: "fox-point-sunny", title: "Sunny room in Fox Point", amountCents: 95000 },
) {
  const client = stripe();
  const customerId = await customer(user);
  const table = kind === "card" ? "flows" : "payments";
  const prior = (await db
    .prepare(
      kind === "card"
        ? "SELECT * FROM flows WHERE user_id=? AND kind='card' AND status='pending' ORDER BY created_at DESC LIMIT 1"
        : "SELECT * FROM payments WHERE user_id=? AND status IN ('pending','paid') LIMIT 1",
    )
    .get(user.id)) as
    { id: string; provider_id: string | null; status: string } | undefined;
  if (prior?.status === "paid")
    throw new HttpError(409, "This reservation has already been paid.");
  const id = prior?.id || randomUUID();
  if (!prior) {
    if (kind === "card")
      await db.prepare(
        "INSERT INTO flows(id,user_id,kind,created_at) VALUES(?,?,'card',?)",
      ).run(id, user.id, Date.now());
    else
      await db.prepare(
        "INSERT INTO payments(id,user_id,amount,status,created_at,listing_id) VALUES(?,?,?,'pending',?,?)",
      ).run(id, user.id, room.amountCents, Date.now(), room.listingId);
  }
  const session = prior?.provider_id
    ? await client.checkout.sessions.retrieve(prior.provider_id)
    : await client.checkout.sessions.create(
        {
          customer: customerId,
          mode: kind === "card" ? "setup" : "payment",
          allowed_payment_method_types: ["card"],
          client_reference_id: user.id,
          metadata: { userId: user.id, kind, recordId: id },
          success_url: `${appUrl()}/?returned=${kind}`,
          cancel_url: `${appUrl()}/?canceled=${kind}`,
          ...(kind === "payment"
            ? {
                line_items: [
                  {
                    price_data: {
                      currency: "usd",
                      unit_amount: room.amountCents,
                      product_data: {
                        name: `Roomsure · ${room.title} · first month (test reservation)`,
                      },
                    },
                    quantity: 1,
                  },
                ],
              }
            : { setup_intent_data: { metadata: { userId: user.id } } }),
        },
        { idempotencyKey: id },
      );
  await db.prepare(`UPDATE ${table} SET provider_id=? WHERE id=?`).run(
    session.id,
    id,
  );
  if (session.status === "expired") {
    await db.prepare(`UPDATE ${table} SET status='expired' WHERE id=?`).run(id);
    throw new HttpError(409, "Checkout expired. Please try again.");
  }
  if (session.status === "complete")
    throw new HttpError(
      409,
      "Checkout is being confirmed. Refresh in a moment.",
    );
  return session.url;
}
