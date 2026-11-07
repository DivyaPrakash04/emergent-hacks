# Roomsure

The new authentication, identity and payment app lives in **[platform/](platform/README.md)**.

```sh
cd platform
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. It runs without provider keys in demo mode and supports Stripe/Resend integrations in test mode. See the platform README for configuration and tests.

The original HTML prototype, MVP requirements and pitch deck are retained as product references. The platform is built independently from the prototype.
