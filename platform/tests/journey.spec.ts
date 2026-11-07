import { test, expect } from "@playwright/test";
test("seeker completes identity and payment, persists sessions, and changes password", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const email = `maya-${Date.now()}@example.com`;
  await page.goto("/");
  await page.screenshot({ path: "test-results/sign-up.png", fullPage: true });
  await page.getByLabel("Full name").fill("Maya Chen");
  await page.getByLabel("Email address").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("a unique test password");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Good to have you here, Maya." }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/overview.png", fullPage: true });
  await page.getByRole("button", { name: "Payments", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pay $950.00 in test mode" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Identity & trust", exact: true })
    .click();
  await page.getByRole("button", { name: "Send verification code" }).click();
  const inbox = page.locator(".demo-code strong");
  await expect(inbox).toBeVisible();
  const code = (await inbox.textContent())!;
  await page.getByLabel("Six-digit code").fill("000000");
  await page.getByRole("button", { name: "Verify email", exact: true }).click();
  await expect(page.locator(".notice.error")).toContainText("incorrect");
  await page.getByLabel("Six-digit code").fill(code);
  await page.getByRole("button", { name: "Verify email", exact: true }).click();
  await page.getByRole("button", { name: "Start identity check" }).click();
  await page
    .getByRole("button", { name: "Try a failed check instead" })
    .click();
  await expect(
    page.getByText("The previous check needs another attempt."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start identity check" }).click();
  await page.getByRole("button", { name: "Simulate successful check" }).click();
  await page
    .getByRole("button", { name: "Connect payment method", exact: true })
    .click();
  await page.getByRole("button", { name: "Simulate successful check" }).click();
  await expect(page.locator(".verification-panel .badge").first()).toHaveText(
    "Checks complete",
  );
  await page.getByRole("button", { name: "Payments", exact: true }).click();
  await page.getByRole("button", { name: "Pay $950.00 in test mode" }).click();
  await page
    .getByRole("button", { name: "Try a declined payment instead" })
    .click();
  await expect(
    page.getByRole("cell", { name: "Declined", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pay $950.00 in test mode" }).click();
  await page
    .getByLabel(
      "I understand this is a simulated $950 payment for a sample room.",
    )
    .check();
  await page
    .getByRole("button", { name: "Simulate successful payment" })
    .click();
  await expect(page.getByText("Test payment complete · $950.00")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Good to have you here, Maya." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Payments", exact: true }).click();
  await expect(page.getByText("Test payment complete · $950.00")).toBeVisible();
  await page.screenshot({ path: "test-results/payments.png", fullPage: true });
  await page
    .getByRole("button", { name: "Account & security", exact: true })
    .click();
  await page.getByLabel("Current password").fill("a unique test password");
  await page.getByLabel("New password").fill("a changed test password");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByRole("status")).toContainText("Password updated");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Make yourself at home." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Email address").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("a changed test password");
  await page
    .getByRole("button", { name: "Sign in", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Good to have you here, Maya." }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});
test("API enforces authentication, CSRF, challenge ordering, and host permission", async ({
  request,
}) => {
  const origin = { Origin: "http://127.0.0.1:3100" };
  expect(
    (
      await request.post("/api/payment/start", { headers: origin, data: {} })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.post("/api/auth/signup", {
        headers: { Origin: "https://evil.example" },
        data: {},
      })
    ).status(),
  ).toBe(403);
  const email = `host-${Date.now()}@example.com`;
  expect(
    (
      await request.post("/api/auth/signup", {
        headers: origin,
        data: {
          name: "Priya",
          email,
          password: "a secure host password",
          role: "host",
        },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await request.post("/api/demo/complete", {
        headers: origin,
        data: { kind: "identity", outcome: "success" },
      })
    ).status(),
  ).toBe(403);
  const code = (
    await (
      await request.post("/api/email/send", { headers: origin, data: {} })
    ).json()
  ).demoCode;
  expect(
    (
      await request.post("/api/email/verify", {
        headers: origin,
        data: { code },
      })
    ).ok(),
  ).toBeTruthy();
  for (const kind of ["identity", "card"])
    expect(
      (
        await request.post("/api/demo/complete", {
          headers: origin,
          data: { kind, outcome: "success" },
        })
      ).ok(),
    ).toBeTruthy();
  expect((await (await request.get("/api/me")).json()).user.verified).toBe(
    false,
  );
  await request.post("/api/host/consent", {
    headers: origin,
    data: { consent: true },
  });
  expect((await (await request.get("/api/me")).json()).user.verified).toBe(
    true,
  );
  expect(
    (
      await request.post("/api/payment/start", {
        headers: origin,
        data: { amount: 1 },
      })
    ).status(),
  ).toBe(403);
  const session = await request.get("/api/me");
  const snap = await session.json();
  expect(snap.user.password).toBeUndefined();
  expect(snap.user.customer_id).toBeUndefined();
});
