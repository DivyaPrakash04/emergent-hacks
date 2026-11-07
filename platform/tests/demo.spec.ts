// Demo-mode payment flow for the live demo: one-click login as Maya, a simulated
// reservation charged at the reserved room's own price, and a reset so the demo can
// run again. Runs against the production build like journey.spec.ts.
import { expect, test } from "@playwright/test";

const origin = { Origin: "http://127.0.0.1:3100" };

test("Continue as Maya: signed in, already verified, ready to reserve", async ({ request }) => {
  expect((await request.post("/api/demo/login", { headers: origin, data: {} })).status()).toBe(200);
  const me = await (await request.get("/api/me")).json();
  expect(me.mode).toBe("demo");
  expect(me.user.name).toBe("Maya Chen");
  expect(me.user.role).toBe("seeker");
  expect(me.user.verified).toBe(true);
  expect(me.user.password).toBeUndefined();
});

test("demo login refuses other sites (CSRF) like every other POST", async ({ request }) => {
  expect((await request.post("/api/demo/login", { headers: { Origin: "https://evil.example" }, data: {} })).status()).toBe(403);
});

test("a reservation is charged at the reserved room's price, once, until Reset demo", async ({ request }) => {
  await request.post("/api/demo/login", { headers: origin, data: {} });
  await request.post("/api/demo/reset", { headers: origin, data: {} });

  // The client can't set the price: the server reads it from the listing.
  const start = await (await request.post("/api/payment/start", {
    headers: origin, data: { listingId: "downcity-studio", amount: 1 },
  })).json();
  expect(start).toMatchObject({ demo: true, listingId: "downcity-studio", amount: 100000 });

  const paid = await request.post("/api/demo/complete", {
    headers: origin, data: { kind: "payment", outcome: "success", listingId: "downcity-studio" },
  });
  expect(paid.status()).toBe(200);
  let me = await (await request.get("/api/me")).json();
  expect(me.payments[0]).toMatchObject({ amount: 100000, status: "paid", listing_id: "downcity-studio" });

  // A second reservation is refused until the demo is reset.
  const again = await request.post("/api/demo/complete", {
    headers: origin, data: { kind: "payment", outcome: "success", listingId: "fox-point-sunny" },
  });
  expect(again.status()).toBe(409);

  expect((await request.post("/api/demo/reset", { headers: origin, data: {} })).status()).toBe(200);
  me = await (await request.get("/api/me")).json();
  expect(me.payments).toEqual([]);

  const fox = await request.post("/api/demo/complete", {
    headers: origin, data: { kind: "payment", outcome: "success", listingId: "fox-point-sunny" },
  });
  expect(fox.status()).toBe(200);
  me = await (await request.get("/api/me")).json();
  expect(me.payments[0]).toMatchObject({ amount: 95000, listing_id: "fox-point-sunny" });
});

test("suspended or unknown rooms can't be reserved", async ({ request }) => {
  await request.post("/api/demo/login", { headers: origin, data: {} });
  for (const listingId of ["jewelry-district-studio", "no-such-room"]) {
    const res = await request.post("/api/payment/start", { headers: origin, data: { listingId } });
    expect(res.status()).toBe(404);
  }
});

test("demo routes need a signed-in user for reset", async ({ request }) => {
  expect((await request.post("/api/demo/reset", { headers: origin, data: {} })).status()).toBe(401);
});

test("intake and check routes answer without a key, using the rules, and say so", async ({ request }) => {
  const intake = await (await request.post("/api/intake", {
    headers: origin,
    data: { text: "I'm interning downtown June 1 to August 15. Budget around $900, $1,050 max. Commute ideally 20 minutes, 35 at most. I need a kitchen, furnished matters a lot, and I can live with up to 5 days' gap." },
  })).json();
  expect(intake.source).toBe("rules");
  expect(intake.fallback).toBe("no_api_key");
  expect(intake.preferences.price).toEqual({ ideal: 900, limit: 1050 });
  expect(intake.destination).toBe("work");

  const check = await (await request.post("/api/check", {
    headers: origin,
    data: { text: "Furnished room near Wickenden St, $550/month, available June 1. I'm working abroad right now so I can't show the room, but I'll mail you the keys. Please wire the $550 deposit today to hold it, many people are interested. Text me at (401) 555-0147." },
  })).json();
  expect(check.verdict).toBe("high_risk");
  expect(check.source).toBe("rules");
  expect(check.signals.map((s: { evidence?: string }) => s.evidence)).toContain("wire the $550 deposit today");

  expect((await request.post("/api/check", { headers: origin, data: { text: "" } })).status()).toBe(400);
  expect((await request.post("/api/intake", { headers: { Origin: "https://evil.example" }, data: { text: "hi" } })).status()).toBe(403);
});

test("website rooms reserve at the website's own prices", async ({ request }) => {
  await request.post("/api/demo/login", { headers: origin, data: {} });
  await request.post("/api/demo/reset", { headers: origin, data: {} });
  const start = await (await request.post("/api/payment/start", { headers: origin, data: { listingId: "website/downcity-studio" } })).json();
  expect(start).toMatchObject({ listingId: "website/downcity-studio", amount: 102000 });
  expect((await request.post("/api/demo/complete", {
    headers: origin, data: { kind: "payment", outcome: "success", listingId: "website/downcity-studio" },
  })).status()).toBe(200);
  const me = await (await request.get("/api/me")).json();
  expect(me.payments[0]).toMatchObject({ amount: 102000, listing_id: "website/downcity-studio" });
  expect((await request.post("/api/payment/start", { headers: origin, data: { listingId: "website/no-such-room" } })).status()).toBe(404);
  await request.post("/api/demo/reset", { headers: origin, data: {} });
});
