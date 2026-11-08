# Roomsure account platform

A standalone Next.js app for Roomsure authentication, identity verification and payments. This is a new app; it does not load or modify the original HTML prototype.

## Run locally

Requires **Node 24+** (uses the built-in SQLite driver).

```sh
cd platform
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Create an account with a sample email and a unique password. The default `demo` provider mode runs the full flow without API keys:

1. Create a seeker or host account. Passwords are hashed with salted scrypt; sessions use random, server-stored tokens in HTTP-only cookies.
2. Open **Identity & trust**, send a code, and use the code shown in the demo inbox.
3. Simulate the ID/selfie and card checks; failed checks can be retried. Hosts also confirm permission to rent (self-attestation, not ownership verification).
4. A verified seeker can open **Payments** and simulate payment for the seeded $950 Fox Point reservation. Try a decline, then a success.
5. Transaction history and activity persist in SQLite. Account settings support password changes (revoking other sessions) and sign-out.

Accounts and sessions are real local application records in both modes. Only email delivery, identity/card checks and payment outcomes are simulated in demo mode. Never use an important or reused password for testing.

## Deploy this backend independently on Render

The `platform/` app can be deployed separately from the Vercel website. This does not change the website. The app stores accounts, sessions, and payment records in SQLite, so it needs a persistent disk. Render's Free web services have ephemeral filesystems and cannot attach persistent disks; use a paid web service for a durable SQLite deployment. See [Render's Free instance limitations](https://render.com/docs/free) and [persistent disk documentation](https://render.com/docs/disks).

1. In Render, create a **Web Service** from the GitHub repository. Set the service root directory to `platform/`.
2. Configure the build command as `npm ci && npm run build` and the start command as `npm run start`. The project requires Node.js 24 or newer; its production start script binds to `0.0.0.0` and uses Render's `PORT` environment variable.
3. Choose a paid compute plan and attach a persistent disk mounted at `/var/data` (1 GB is enough for this demo database).
4. Set these service variables:

   ```dotenv
   APP_URL=https://<your-render-domain>
   PROVIDER_MODE=demo
   DATABASE_PATH=/var/data/roomsure.sqlite
   ```

5. Open the Render service URL to use the platform app independently. Keep `PROVIDER_MODE=demo`; do not add real identity documents or payment details to this hackathon demo.

This backend is not connected to the Vercel website. For a private GitHub repo, Render's GitHub integration must be authorized to access that repo; if it does not appear in your account, the repository owner may need to grant the Render GitHub App access. When integration is planned, route the website's `/api/*` requests to this service and set `APP_URL` to the website's origin so the Origin check accepts requests. Keep the frontend deployment unchanged until that integration is ready and verified.

## Stripe-backed test mode

Set the following in `.env.local` and restart:

```dotenv
APP_URL=http://localhost:3000
PROVIDER_MODE=stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
EMAIL_FROM=Roomsure <verify@your-verified-domain.example>
```

Use a fresh database when switching modes: set `DATABASE_PATH=.data/stripe-test.sqlite`. The app binds each database to its initial provider mode and rejects mode switching on the same database. Simulated verification or payment records cannot carry into Stripe mode.

Configure Stripe Identity in your test account and use its test verification flow. Card collection uses hosted Stripe Checkout in setup mode (no $1 charge); a separate Checkout payment charges **$950 in test mode** for the seeded reservation. The amount and currency are set on the server. Live Stripe keys and live webhook events are rejected.

Forward signed snapshot events locally:

```sh
stripe listen \
  --events identity.verification_session.verified,identity.verification_session.requires_input,identity.verification_session.processing,identity.verification_session.canceled,checkout.session.completed,checkout.session.expired,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed \
  --forward-to localhost:3000/api/webhook
```

Use the listener's `whsec_` value above. Redirecting back from Stripe does **not** mark anything successful: the webhook verifies its signature, re-fetches provider state, checks ownership/amount, and then commits the result. Event IDs deduplicate deliveries. The UI refreshes provider status every five seconds while signed in. Resend requires an API key and an authorized sender; code delivery errors are shown to the user.

The provider-backed paths compile and have mocked webhook tests, but have **not** been exercised against real Stripe/Resend credentials in this implementation session.

## Tests

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Core tests cover password hashing, code expiry/lockout/single use, host checks, CSRF origin validation, rate limiting, duplicate-payment prevention, signature verification, webhook ownership/amount validation and replay handling. Browser tests exercise the seeker journey, failures/retries, payment history, sessions, password changes, host authorization and mobile overflow. The browser suite starts the production build on port 3100 with a separate test database.

## Integration API

All JSON POST routes except `/api/webhook` require an `Origin` matching `APP_URL`. Authenticated routes use the session cookie; verification and payment state cannot be set by the client in Stripe mode.

| Route                         | Purpose                                                    |
| ----------------------------- | ---------------------------------------------------------- |
| GET `/api/me`                 | Safe account snapshot, payment history and recent activity |
| POST `/api/auth/signup`       | `{name,email,password,role}`                               |
| POST `/api/auth/login`        | `{email,password}`                                         |
| POST `/api/auth/logout`       | Revoke current session                                     |
| POST `/api/email/send`        | Issue a ten-minute, five-attempt email challenge           |
| POST `/api/email/verify`      | `{code}`                                                   |
| POST `/api/identity/start`    | Hosted identity link or demo simulation                    |
| POST `/api/card/start`        | Hosted card-setup link or demo simulation                  |
| POST `/api/payment/start`     | `{listingId?}`: checkout for that room's first month (price from server-side listing data; default Fox Point $950); verified seekers only |
| POST `/api/host/consent`      | Host permission self-attestation `{consent}`               |
| POST `/api/security/password` | `{currentPassword,newPassword}`, revokes existing sessions |
| POST `/api/demo/complete`     | Demo mode only: `{kind,outcome,listingId?}`                |
| POST `/api/demo/login`        | Demo mode only: sign in as Maya (verified demo seeker)     |
| POST `/api/demo/reset`        | Demo mode only: clear your simulated reservations          |
| POST `/api/webhook`           | Stripe-signed raw event body                               |

## Deployment boundary

This implementation is a test-mode MVP, not a live rental marketplace. It includes one fixed sample reservation per seeker. It does not implement room inventory, host payouts, Stripe Connect, escrow, refunds/disputes, production identity retention workflows, MFA, account recovery or verified ownership records.

Deploy the SQLite app as a **single Node process with persistent writable disk**, with HTTPS and the matching `APP_URL`. Do not deploy this database unchanged to ephemeral/serverless storage such as a default Vercel function. Use a managed database and shared rate limiter before scaling to multiple instances. Set `PROVIDER_MODE` explicitly in production; an unset value fails closed. The deployment must exclude demo records from any future live payment implementation.

Official integration references: [Stripe Identity](https://docs.stripe.com/identity/verify-identity-documents), [Stripe card setup](https://docs.stripe.com/payments/checkout/save-and-reuse), [Stripe webhooks](https://docs.stripe.com/webhooks), [Resend email API](https://resend.com/docs/api-reference/emails/send-email).
