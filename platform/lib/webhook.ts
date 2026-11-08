import type Stripe from "stripe";
import { db, transaction, type DatabaseHandle } from "./db";
import { stripe } from "./providers";
// Re-fetch provider objects to avoid stale, out-of-order event payloads.
// Ownership is bound to server-created rows; metadata alone cannot grant access.
export async function processEvent(event: Stripe.Event, client = stripe()) {
  if (event.livemode) throw new Error("Live events are disabled");
  if (await db.prepare("SELECT id FROM events WHERE id=?").get(event.id)) return;
  let apply = async (_tx: DatabaseHandle) => {};
  if (event.type.startsWith("identity.verification_session.")) {
    const object = event.data.object as Stripe.Identity.VerificationSession;
    const flow = (await db
      .prepare("SELECT * FROM flows WHERE provider_id=? AND kind='identity'")
      .get(object.id)) as { id: string; user_id: string } | undefined;
    if (!flow) throw new Error("Unknown identity session");
    const current = await client.identity.verificationSessions.retrieve(
      object.id,
    );
    const status =
      current.status === "verified"
        ? "verified"
        : current.status === "requires_input"
          ? "needs_input"
          : current.status === "canceled"
            ? "canceled"
            : "pending";
    apply = async (tx) => {
      await tx.prepare("UPDATE users SET identity_status=? WHERE id=?").run(
        status,
        flow.user_id,
      );
      await tx.prepare("UPDATE flows SET status=? WHERE id=?").run(
        status === "verified"
          ? "complete"
          : status === "canceled"
            ? "canceled"
            : "pending",
        flow.id,
      );
      await tx.prepare(
        "INSERT INTO activity(user_id,message,created_at) VALUES(?,?,?)",
      ).run(flow.user_id, `Identity verification: ${status}`, Date.now());
    };
  } else if (event.type.startsWith("checkout.session.")) {
    const object = event.data.object as Stripe.Checkout.Session;
    const current = await client.checkout.sessions.retrieve(object.id, {
      expand: ["setup_intent.payment_method"],
    });
    const flow = (await db
      .prepare("SELECT * FROM flows WHERE provider_id=? AND kind='card'")
      .get(object.id)) as { id: string; user_id: string } | undefined;
    const payment = (await db
      .prepare("SELECT * FROM payments WHERE provider_id=?")
      .get(object.id)) as
      { id: string; user_id: string; amount: number } | undefined;
    if (!flow && !payment) throw new Error("Unknown checkout session");
    const owner = flow?.user_id || payment!.user_id;
    const user = (await db
      .prepare("SELECT customer_id FROM users WHERE id=?")
      .get(owner)) as { customer_id: string };
    if (
      current.customer !== user.customer_id ||
      current.client_reference_id !== owner
    )
      throw new Error("Checkout ownership mismatch");
    if (flow && current.mode === "setup") {
      const setup = current.setup_intent as Stripe.SetupIntent | null;
      const method = setup?.payment_method as Stripe.PaymentMethod | null;
      if (
        current.status === "complete" &&
        setup?.status === "succeeded" &&
        method?.card
      ) {
        apply = async (tx) => {
          await tx.prepare(
            "UPDATE users SET card_status='verified',card_last4=? WHERE id=?",
          ).run(method.card!.last4, owner);
          await tx.prepare("UPDATE flows SET status='complete' WHERE id=?").run(
            flow.id,
          );
          await tx.prepare(
            "INSERT INTO activity(user_id,message,created_at) VALUES(?,?,?)",
          ).run(owner, "Payment method confirmed in Stripe test mode", Date.now());
        };
      } else if (current.status === "expired")
        apply = async (tx) => {
          await tx.prepare("UPDATE flows SET status='expired' WHERE id=?").run(
            flow.id,
          );
        };
    } else if (payment && current.mode === "payment") {
      if (current.amount_total !== payment.amount || current.currency !== "usd")
        throw new Error("Payment amount mismatch");
      const paid = current.payment_status === "paid";
      if (paid || current.status === "expired")
        apply = async (tx) => {
          await tx.prepare("UPDATE payments SET status=? WHERE id=?").run(
            paid ? "paid" : "expired",
            payment.id,
          );
          await tx.prepare(
            "INSERT INTO activity(user_id,message,created_at) VALUES(?,?,?)",
          ).run(
            owner,
            paid
              ? "Test reservation payment received"
              : "Test checkout expired",
            Date.now(),
          );
        };
    }
  }
  await transaction(async (tx) => {
    if (await tx.prepare("SELECT id FROM events WHERE id=?").get(event.id)) return;
    await apply(tx);
    await tx.prepare("INSERT INTO events(id,created_at) VALUES(?,?)").run(
      event.id,
      Date.now(),
    );
  });
}
