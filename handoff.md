# Roomsure handoff

**Written:** 2026-11-07, evening, by Claude Code for David (jinghihong), who handed off to a teammate.
**Read this first** if you're picking up the build, human or Claude. Then [README.md](README.md), [MVP requirements](Roomsure%20MVP%20Requirements%20%28for%20LLM%20build%29.md), [ARCHITECTURE.md](ARCHITECTURE.md), and [demo-script.md](demo-script.md).

## Where things stand

| Area | State |
|---|---|
| **UI** (`website/`) | Lovable export (PR #7), all 8 screens. Now calls the real backend through `src/lib/roomsure/api.ts` for demo login, intake, scam check and reservations, with mock fallback. Checked end to end in a browser. |
| **Backend** (`platform/`) | Accounts, sessions, Passport (PR #2). Demo login, Reset demo, verified demo accounts recreated on every start, per-room prices set on the server, `/api/intake` and `/api/check` (Claude with rule fallback). |
| **Shared logic** (`platform/lib/roomsure/`) | Ranking engine with the trust switch, `buildDeck()`, 12 demo rooms, scam rules, fair price, intake parser, chat, mock API. Used by the backend, `ranking/demo.html`, and the eval. **Not** used by `website/` yet (see the data split below). |
| **Claude** (`platform/lib/ai/`) | `claude-opus-5-5`, low effort, Zod-validated structured output, 8 s timeout, server-side refusal fallback. **Not live:** the Anthropic account behind the key in David's `platform/.env.local` has no API credits, so every call returns "credit balance too low" and the app falls back to the rules. |
| **3D** (`roomwalk/`) | Viewer works, with the team's own kitchen scan (`roomwalk/viewer/demo/kitchen.splat`, loads with `?scene=./demo/kitchen.splat`). **Not yet shown inside the website.** |
| **Eval** (`platform/evals/`) | 27 approved cases and plain-code graders. Rules baseline: intake 7/15 fully correct, scam check 11/12. Claude results pending credits. |
| **Deploy** | Not done. |

**Tests (all passing on this branch):** platform 37 unit + 9 browser (`npm test`, `npm run test:e2e`), website 25 (`npx vitest run`), ranking 16 (`node --test ranking/rankListings.test.ts`). Type checks and production builds pass for both apps.

## How the two apps fit

```
browser ──► website (TanStack Start, :5173) ──/api──► platform (Next.js, :3000) ──► Claude API
                 │ falls back to local mocks if no backend answers
```

- In dev, `website/vite.config.ts` proxies `/api` to `127.0.0.1:3000`. Run the backend with `APP_URL=http://localhost:5173`: its origin check must match the website's address, or every POST gets a 403.
- The session cookie is same-origin through the proxy. Keep it that way in production (see Deploy).
- Original plan (docs): port the Lovable screens into `platform/` as one app. Because Eric imported the website as its own app, the faster, lower-risk path was to wire `website/` to `platform/` through `/api`. Porting is still possible later, but not needed for the demo.

## Next steps, in order

1. **Merge this PR** (`feat/website-integration`). It also carries the demo-payment and eval commits that missed PR #6.
2. **Fix Anthropic API credits.** Add credits at console.anthropic.com → Settings → Billing, in the **same organization** as the key. A claude.ai subscription is not API credit. Then:
   - Pilot (12 calls, cents): `cd platform && EVAL_ONLY=3 npx tsx evals/run-eval.mjs --flow .claude/hillclimb/intake --variant v1 --model claude-opus-5-5 --reps 2 --timeout-s 60`, then the same with `--flow .claude/hillclimb/check`.
   - Read `usage` from `.claude/hillclimb/*/v1/results.jsonl`. Price: $4/MTok in, $20/MTok out. Show the measured cost and latency to the team before the full run (drop `EVAL_ONLY`).
   - Put the real numbers into the blank in `demo-script.md` (judge Q&A, "What does the AI actually do?").
3. **Deploy** (two apps; same origin for `/api`):
   - Backend on Vercel, root `platform/`, Node 24. Env: `PROVIDER_MODE=demo` (**required**: unset in production makes every API call fail), `DATABASE_PATH=/tmp/roomsure.sqlite`, `ANTHROPIC_API_KEY`, `APP_URL=<the website's public URL>`.
   - Website: its Lovable config builds with Nitro (Cloudflare preset by default). Deploy it, then proxy `/api/*` to the backend URL from the website's host (a Vercel rewrite, or Nitro `routeRules` with `proxy`) so cookies stay same-origin. Without the proxy, the website silently falls back to mocks.
   - Present only from the production URL. Keep the laptop backup (both dev servers) ready.
4. **Show the 3D tour in the website.** Copy `roomwalk/viewer/` into `website/public/roomwalk/`, and in the room-detail overlay iframe `listing.scanUrl` (set it to `/roomwalk/index.html?scene=./demo/kitchen.splat` for 1–2 rooms). Label it "Sample 3D scan · demo". RoomWalk's own server sends COOP/COEP headers for smoother sorting; without them it still works, just a bit slower.
5. **One data set.** Today the website has its own 8 rooms and its own trust multiplier (×0.75, in `website/src/lib/roomsure/deck.ts`), while the docs and `platform/` use 12 rooms and ×0.85. Reservations bridge the gap: the website sends `website/<id>`, and `platform/lib/roomsure/data/website-rooms.ts` holds those prices, guarded by a test against `website/src/lib/roomsure/data/listings.ts`. Pick one source (the website's rooms are what judges see), then update the docs' fixture numbers (MVP section 4, `demo-script.md`). Update, Nov 7, 2026: `demo-script.md` now follows the website (4-card deck, ×0.75, the website's scam sample and clicks); the MVP spec and `platform/` still use 12 rooms and ×0.85.
6. **Rules gaps the website's sample listing exposed** (Claude covers them once it has credits): "Contact me only by email" isn't flagged by `platform/lib/roomsure/scam.ts`, and "June 1 to August 31" isn't read as dates. Changing `scam.ts` changes the eval harness, so a person has to re-approve it (see below).
7. **Evaluations** (MVP section 12): a Playwright test of the demo path on the **website**, and a hallway test with 2–3 people outside the team.

## Gotchas

- **Check the GitHub account before pushing** on David's Mac: `gh auth status`. Only `jinghihong` should be signed in.
- **Eval harness gate:** `run-eval.mjs` refuses to run if any file in `_state.json.harness_paths` (cases, graders, runner, Claude adapter, rules) changed since a person last ran it with `--approve-harness`. That flag is for a human to pass after reviewing the change, not for an agent on its own.
- **Never paste API keys into chat or commit them.** `platform/.env.local` is git-ignored.
- **Browser tests force the rules path** (`ANTHROPIC_API_KEY: ""` in `playwright.config.ts`), so CI never spends money.
- **One paid reservation per user** in demo mode. "Reset demo" (`POST /api/demo/reset`, wired to the website's Passport) clears it.
- **`next dev`** rewrites `platform/next-env.d.ts` (don't commit that change) and writes `platform/AGENTS.md` (committed on purpose).
- **The website's TypeScript is stricter** than the backend's: `env["NAME"]` for index signatures, no `undefined` in optional fetch fields.
- **Bun isn't installed on David's Mac.** `npm install --no-package-lock` in `website/` works without touching `bun.lock`.
- **The website is a ZIP import, not Lovable git sync.** If the team keeps editing in Lovable and re-exports, keep `src/lib/roomsure/api.ts` and `backend.ts` (the backend wiring) or redo it.

## Decisions log

| Decision | Why |
|---|---|
| Mock payments (`PROVIDER_MODE=demo`), not Stripe | Zero setup, no card form, can't fail on stage. The Stripe test-mode path exists in code as a talking point. |
| Claude reads text; code decides scores, prices and verdicts | Reliable, explainable, works offline; quotes are only shown if they're exact. |
| "Prefer verified hosts" switch on by default | Ties trust into ranking while staying the seeker's choice. |
| Website wired to the backend through `/api` instead of porting into `platform/` | The website arrived as its own app; wiring is hours faster and lower risk. |
| Eval graded by plain code, no judge model | Structured outputs make exact grading possible: cheaper, no judge bias. |
