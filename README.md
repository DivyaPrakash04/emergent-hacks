# Roomsure

Roomsure helps people find a room for one to six months, and check it before they pay. Tell it what you need in one sentence. It ranks rooms by your own trade-offs, explains every card, lets you walk the room in 3D, and flags scam signals in listings you found elsewhere.

## Why we are building it

People who need housing for a summer internship, a hospital rotation or a short contract are stuck between nightly-stay platforms (expensive), year-long leases (too long), and informal posts (where scams live). Informal listings have the right inventory, but it is hard to compare them, judge the price, or spot a scam.

Roomsure makes trade-offs visible, shows why each room ranked where it did, lets you inspect the room before you commit, and shows exactly which words in a listing look suspicious.

## What the demo shows

1. **Continue as Maya**: one-click demo login. Her Roomsure Passport shows simulated email, ID and card checks.
2. **Describe your needs** in one sentence. Claude fills in editable preferences, and rules take over if Claude is unavailable.
3. **Swipe a ranked deck.** Every card has a score and a plain-English reason ("#1 because it covers every date and is furnished; you give up $50 on price"). Move a slider and the deck re-ranks instantly.
4. **Near misses**: when no room fits, see the one change that brings each room back.
5. **Walk the room in 3D** from the detail page (RoomWalk Gaussian-splat viewer).
6. **Match → chat → reserve**: a simulated host reply, a mock chat, and a simulated checkout for that room.
7. **Scam check**: paste an outside listing to see the facts, the exact suspicious phrases, and a risk verdict.

All people, rooms, prices, verification, matching, chat and payments in the demo are synthetic or simulated. No real ID, card number or payment is collected.

## How it fits together

| Folder | What it is | Started in |
|---|---|---|
| `website/` | **The UI judges see.** Designed in Lovable (TanStack Start, React, Tailwind). Talks to the backend through `/api` (`src/lib/roomsure/api.ts`), falling back to local mocks if no backend answers. | [PR #7](https://github.com/ericmxf17/emergent-hacks/pull/7) |
| `platform/` | **The backend** (Next.js): real accounts and sessions, demo login and reset, simulated verification and payments priced on the server, and the Claude routes (`/api/intake`, `/api/check`) with rule fallbacks. Also holds the shared logic in `lib/roomsure/` and the eval in `evals/`. | [PR #2](https://github.com/ericmxf17/emergent-hacks/pull/2) |
| `ranking/` | Ranking engine docs, tests and the offline `demo.html`. The engine itself now lives in `platform/lib/roomsure/`. | [PR #4](https://github.com/ericmxf17/emergent-hacks/pull/4) |
| `roomwalk/` | 3D room viewer source and the video-to-3D scan pipeline (Modal or local GPU). The viewer is copied into `platform/public/roomwalk/`. | [PR #3](https://github.com/ericmxf17/emergent-hacks/pull/3) |

## Product principles

1. **The seeker chooses the trade-offs.** A deterministic formula ranks rooms and explains every score. Trust is one of the seeker's settings ("Prefer verified hosts"), not a hidden thumb on the scale.
2. **One ranking powers everything.** Deck, list, shortlist and detail all show the same results.
3. **AI understands, math decides.** Claude reads sentences and listings. Code computes scores and scam verdicts, and every path has a non-AI fallback.
4. **Trust claims stay specific.** A simulated badge is not proof of safety. A 3D scan is an inspection aid. Outside listings are always "not verified by Roomsure".
5. **Privacy and fairness.** No protected traits in matching. No real identity or payment data in the demo.

## Running it

Use Node 24. Two terminals: the backend, then the website.

**1. Backend** (`platform/`, port 3000). Copy `.env.example` to `.env.local` once and add `ANTHROPIC_API_KEY` there for Claude; without a key or without API credits, the rule fallbacks run and the screens say "Read by rules (offline)".

```sh
cd platform && npm ci
APP_URL=http://localhost:5173 npm run dev
```

`APP_URL` must be the website's address, because the backend only accepts requests from that origin.

**2. Website** (`website/`, port 5173). Vite sends `/api` to the backend on port 3000 (`website/vite.config.ts`).

```sh
cd website && bun install --frozen-lockfile && bun run dev --port 5173
```

Without Bun: `npm install --no-package-lock && npx vite dev --port 5173`. Open http://localhost:5173.

**Tests:** `cd platform && npm test && npm run test:e2e` (browser tests never call the paid API), `cd website && bun run test`, and `node --test ranking/rankListings.test.ts`.

**Status and next steps** for whoever picks this up: [handoff.md](handoff.md).

## Project documents

- [MVP requirements](Roomsure%20MVP%20Requirements%20%28for%20LLM%20build%29.md): scope, behavior, ranking fixtures, acceptance criteria.
- [Architecture](ARCHITECTURE.md): folders, shared types, routes, Claude adapter, deployment.
- [Demo script](demo-script.md): the two-minute path, a pre-demo checklist, backups, and judge Q&A.
- [Lovable prompts](lovable/lovable-prompts.md) and [Lovable rules](lovable/AGENTS.md): how the team designs the UI in Lovable, step by step.
- [Master build prompt](MASTER_PROMPT.md): instructions for a coding LLM or teammate.
- [Pitch deck](Roomsure%20Pitch%20Deck.pptx) and [HTML prototype](Roomsure%20Prototype.html): story and visual references.
- `Roomsure MVP Requirements (for LLM build).docx`: the original spec, kept as background. The `.md` version wins.

## Team areas

- **Accounts and payments:** `platform/` auth, Passport, checkout (PR #2).
- **Ranking and deck:** engine, fixtures, cards, near misses (PR #4).
- **3D rooms:** RoomWalk viewer and scan pipeline (PR #3).
- **Integration:** seed data, intake, scam check, match and reserve, deploy, rehearsal.

## Demo limitations

The app uses synthetic listings, approximate commute times, and demo fair-price baselines. Verification, host replies, chat and payments are simulated. 3D scans are samples, not the listed rooms. On Vercel, accounts created during the demo can reset when the server restarts; the demo accounts are always recreated. The app does not fetch real listings, verify a real person, move money, or guarantee that any room is legitimate.

## Uploaded website frontend

The Lovable website export is available in [`website/`](website/README.md). It is
a TanStack Start / React / TypeScript frontend, imported from the provided ZIP.
It is wired to the backend in `platform/` through `src/lib/roomsure/api.ts`
(demo login, Claude intake, Claude scam check, reservations); if no backend
answers, each call falls back to the export's original mock.

Run it separately with Bun, using the included lockfile:

```sh
cd website
bun install --frozen-lockfile
bun run dev --port 5173
```

Open http://localhost:5173. Run its existing tests with `bun run test` and build
with `bun run build`. The original website source and export metadata are kept
intact.
