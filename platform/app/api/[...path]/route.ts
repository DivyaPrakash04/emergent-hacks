import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db, log, transaction, type User } from "@/lib/db";
import {
  appUrl,
  createSession,
  currentUser,
  hash,
  HttpError,
  logout,
  originGuard,
  passwordHash,
  passwordMatches,
  providerMode,
  rateLimit,
  requireEmail,
  requireUser,
  verified,
} from "@/lib/auth";
import {
  sendCode,
  startCheckout,
  startIdentity,
  stripe,
  verifyCode,
} from "@/lib/providers";
import { processEvent } from "@/lib/webhook";
import { DEMO_SEEKER_ID, ensureDemoAccounts, reservationFor } from "@/lib/demo";
import { checkListing, readIntake } from "@/lib/ai/claude";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const credentials = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((v) => v.toLowerCase()),
  password: z.string().min(12, "Use at least 12 characters.").max(128),
});
const signup = credentials.extend({
  name: z.string().trim().min(1).max(80),
  role: z.enum(["seeker", "host"]),
});
const json = (value: unknown, status = 200) =>
  NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
async function body(request: Request) {
  const text = await request.text();
  if (text.length > 8192) throw new HttpError(413, "Request is too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Invalid request body.");
  }
}
function snapshot(user: User | null) {
  const mode = providerMode();
  if (!user) return { user: null, mode };
  return {
    mode,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: !!user.email_verified,
      identityStatus: user.identity_status,
      cardStatus: user.card_status,
      cardLast4: user.card_last4,
      consent: !!user.consent,
      verified: verified(user),
      createdAt: user.created_at,
    },
    payments: db
      .prepare(
        "SELECT id,amount,status,created_at,listing_id FROM payments WHERE user_id=? ORDER BY created_at DESC",
      )
      .all(user.id),
    activity: db
      .prepare(
        "SELECT id,message,created_at FROM activity WHERE user_id=? ORDER BY id DESC LIMIT 12",
      )
      .all(user.id),
  };
}
async function handle(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    providerMode();
    await ensureDemoAccounts();
    const path = (await params).path.join("/");
    if (request.method === "GET") {
      if (path === "me") return json(snapshot(await currentUser()));
      throw new HttpError(404, "Not found.");
    }
    if (path === "webhook") {
      if (providerMode() !== "stripe" || !process.env.STRIPE_WEBHOOK_SECRET)
        throw new HttpError(503, "Webhook is not configured.");
      const raw = await request.text();
      let event;
      try {
        event = stripe().webhooks.constructEvent(
          raw,
          request.headers.get("stripe-signature") || "",
          process.env.STRIPE_WEBHOOK_SECRET,
        );
      } catch {
        throw new HttpError(400, "Invalid webhook signature.");
      }
      await processEvent(event);
      return json({ received: true });
    }
    originGuard(request);
    const data = await body(request);
    if (path === "auth/signup") {
      const input = signup.parse(data);
      rateLimit(`signup:${input.email}`, 5);
      const id = randomUUID();
      const encoded = await passwordHash(input.password);
      try {
        db.prepare(
          "INSERT INTO users(id,name,email,password,role,created_at) VALUES(?,?,?,?,?,?)",
        ).run(id, input.name, input.email, encoded, input.role, Date.now());
      } catch (error) {
        if (String(error).includes("UNIQUE"))
          throw new HttpError(
            409,
            "An account with this email already exists. Try signing in.",
          );
        throw error;
      }
      await createSession(id);
      log(id, "Account created");
      return json({ ok: true });
    }
    if (path === "auth/login") {
      const input = credentials.parse(data);
      rateLimit(`login:${input.email}`, 10);
      const user = db
        .prepare("SELECT * FROM users WHERE email=?")
        .get(input.email) as User | undefined;
      // Always perform password derivation, including when the account is missing.
      const valid = await passwordMatches(
        input.password,
        user?.password || "00000000000000000000000000000000:" + "00".repeat(64),
      );
      if (!user || !valid)
        throw new HttpError(401, "Email or password is incorrect.");
      await createSession(user.id);
      log(user.id, "Signed in");
      return json({ ok: true });
    }
    if (path === "demo/login") {
      // One-click "Continue as Maya" for the live demo. Demo mode only.
      if (providerMode() !== "demo") throw new HttpError(404, "Not found.");
      await createSession(DEMO_SEEKER_ID);
      log(DEMO_SEEKER_ID, "Signed in with the demo login");
      return json({ ok: true });
    }
    if (path === "intake" || path === "check") {
      // Claude reads the text; code validates it and decides. Falls back to the
      // offline rules on any failure, and says which path ran (source).
      const { text } = z.object({ text: z.string().trim().min(1, "Type something first.").max(5000) }).parse(data);
      const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
      rateLimit(`ai:${client}`, 60);
      if (path === "intake") {
        const { result, call } = await readIntake(text);
        return json({ ...result, fallback: call.failure ?? null });
      }
      const { result, call } = await checkListing(text);
      return json({ ...result, fallback: call.failure ?? null });
    }
    const user = await requireUser();
    rateLimit(`action:${user.id}`, 100);
    if (path === "demo/reset") {
      // Clears this account's simulated reservations so the demo can run again. Demo mode only.
      if (providerMode() !== "demo") throw new HttpError(404, "Not found.");
      transaction(() => {
        db.prepare("DELETE FROM payments WHERE user_id=?").run(user.id);
        db.prepare("DELETE FROM activity WHERE user_id=?").run(user.id);
      });
      log(user.id, "Demo reset");
      return json({ ok: true });
    }
    if (path === "auth/logout") {
      await logout();
      return json({ ok: true });
    }
    if (path === "email/send") {
      if (user.email_verified)
        throw new HttpError(409, "Email already verified.");
      const demoCode = await sendCode(user);
      return json({ ok: true, demoCode });
    }
    if (path === "email/verify") {
      const input = z.object({ code: z.string().regex(/^\d{6}$/) }).parse(data);
      verifyCode(user, input.code);
      return json({ ok: true });
    }
    if (path === "security/password") {
      const input = z
        .object({
          currentPassword: z.string().max(128),
          newPassword: z.string().min(12).max(128),
        })
        .parse(data);
      rateLimit(`password:${user.id}`, 5);
      if (!(await passwordMatches(input.currentPassword, user.password)))
        throw new HttpError(400, "Current password is incorrect.");
      db.prepare("UPDATE users SET password=? WHERE id=?").run(
        await passwordHash(input.newPassword),
        user.id,
      );
      db.prepare("DELETE FROM sessions WHERE user_id=?").run(user.id);
      await createSession(user.id);
      log(user.id, "Password changed; other sessions signed out");
      return json({ ok: true });
    }
    if (path === "host/consent") {
      if (user.role !== "host")
        throw new HttpError(403, "Only host accounts can confirm permission.");
      const input = z.object({ consent: z.boolean() }).parse(data);
      db.prepare("UPDATE users SET consent=? WHERE id=?").run(
        input.consent ? 1 : 0,
        user.id,
      );
      log(user.id, "Permission-to-rent attestation updated");
      return json({ ok: true });
    }
    requireEmail(user);
    if (path === "identity/start" || path === "card/start") {
      const kind = path === "identity/start" ? "identity" : "card";
      if (
        (kind === "identity" && user.identity_status === "verified") ||
        (kind === "card" && user.card_status === "verified")
      )
        throw new HttpError(409, "This check is already complete.");
      if (providerMode() === "demo") return json({ demo: true, kind });
      const url =
        kind === "identity"
          ? await startIdentity(user)
          : await startCheckout(user, "card");
      if (!url)
        throw new HttpError(502, "Provider did not return a checkout link.");
      return json({ url });
    }
    if (path === "payment/start") {
      if (!verified(user))
        throw new HttpError(
          403,
          "Complete all verification steps before paying.",
        );
      if (user.role !== "seeker")
        throw new HttpError(
          403,
          "This test reservation is for seeker accounts.",
        );
      const room = reservationFor(data?.listingId);
      if (providerMode() === "demo")
        return json({ demo: true, kind: "payment", listingId: room.listingId, title: room.title, amount: room.amountCents });
      return json({ url: await startCheckout(user, "payment", room) });
    }
    if (path === "demo/complete") {
      if (providerMode() !== "demo") throw new HttpError(404, "Not found.");
      const input = z
        .object({
          kind: z.enum(["identity", "card", "payment"]),
          outcome: z.enum(["success", "failure"]),
        })
        .parse(data);
      if (input.kind === "payment") {
        if (!verified(user) || user.role !== "seeker")
          throw new HttpError(403, "Verify a seeker account first.");
        const room = reservationFor(data?.listingId);
        transaction(() => {
          const paid = db
            .prepare(
              "SELECT id FROM payments WHERE user_id=? AND status='paid'",
            )
            .get(user.id);
          if (paid)
            throw new HttpError(409, "This reservation has already been paid.");
          db.prepare(
            "INSERT INTO payments(id,user_id,amount,status,created_at,listing_id) VALUES(?,?,?,?,?,?)",
          ).run(
            randomUUID(),
            user.id,
            room.amountCents,
            input.outcome === "success" ? "paid" : "failed",
            Date.now(),
            room.listingId,
          );
          log(
            user.id,
            input.outcome === "success"
              ? "Simulated reservation payment completed"
              : "Simulated card declined",
          );
        });
      } else {
        const column =
          input.kind === "identity" ? "identity_status" : "card_status";
        db.prepare(
          `UPDATE users SET ${column}=?${input.kind === "card" ? ",card_last4=?" : ""} WHERE id=?`,
        ).run(
          ...(input.kind === "card"
            ? [
                input.outcome === "success" ? "verified" : "needs_input",
                input.outcome === "success" ? "4242" : null,
                user.id,
              ]
            : [
                input.outcome === "success" ? "verified" : "needs_input",
                user.id,
              ]),
        );
        log(
          user.id,
          `Simulated ${input.kind} check ${input.outcome === "success" ? "passed" : "needs another attempt"}`,
        );
      }
      return json({ ok: true });
    }
    throw new HttpError(404, "Not found.");
  } catch (error) {
    if (error instanceof z.ZodError)
      return json(
        { error: error.issues[0]?.message || "Check your input." },
        400,
      );
    if (error instanceof HttpError)
      return json({ error: error.message }, error.status);
    console.error(
      "Roomsure request failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
}
export const GET = handle;
export const POST = handle;
