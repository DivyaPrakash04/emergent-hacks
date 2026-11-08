# Roomsure

**A room you can trust, for 1 to 6 months.**

Mid-term housing is the gap between nightly rentals (too expensive) and year-long leases (too long) — where interns, travel nurses and contract workers end up in informal posts, and where scams live. Roomsure closes the trust gap: describe what you need in one sentence, get rooms ranked by **your** trade-offs with the math shown, **walk through the room in 3D before you pay**, and scam-check any listing you found elsewhere.

**Live demo:** <https://roomsure-hackathon.vercel.app>

> On the static deploy, everything works except generating a *new* 3D scan from your own video — that needs the local scan service (see [Running it locally](#running-it-locally)). The sample videos and all pre-built tours work everywhere.

## Key features

- **One-sentence intake.** Claude turns "I'm interning downtown June–August, ~$900, furnished, need a kitchen" into structured, editable preferences. If Claude is down, deterministic rules take over — the UI labels which one answered.
- **Ranked deck with visible math.** Every card shows its score and a plain-English reason ("#1 because it covers every date and is furnished; you give up $50 on price"). Drag a slider and the deck re-ranks instantly. When nothing fits, *near misses* show the one change that brings each room back.
- **Video → walkable 3D room.** A host films one 20–30 second phone pan. A five-agent Claude vision pipeline turns it into a parametric 3D room you walk with WASD + mouse look, with collision — about 3.5 minutes and ~$1 per room, no LiDAR, no GPU reconstruction.
- **Roomsure Passport.** Simulated email, ID and card verification that gates matching and payments. "Prefer verified hosts" is the seeker's own setting, not a hidden thumb on the scale.
- **Match → chat → reserve.** Simulated host reply, chat unlock, and a first-month checkout priced on the server, running on real accounts and sessions.
- **Scam check for outside listings.** Paste a listing from anywhere; get a risk verdict with the exact suspicious phrases quoted and categorized (payment pressure, can't view, urgency, off-platform contact, price far below fair).
- **Every AI path has a non-AI fallback**, and every trust claim stays specific: a simulated badge is not proof of safety, a 3D scan is an inspection aid, outside listings are always "not verified by Roomsure".

## Business flow

```
HOST                          ROOMSURE                          SEEKER
list a room ───────►  verify both sides (Passport)  ◄─────── describe needs in a sentence
film a 20–30s pan ─►  video → walkable 3D scan                swipe a deck ranked by their
                      rank by the seeker's own                own trade-offs, math shown
                      trade-offs, explain every score         walk the room in 3D
                      host tours, chat, checkout    ◄─────── match → chat → reserve
                                                              (fee on the reservation)
```

The 3D scan is the host's trust upgrade — it makes a listing *inspectable* instead of just photographed. The reservation is the monetization point (simulated today, wired for Stripe test mode). Scam check works on listings from anywhere, which makes Roomsure useful before a seeker ever books through it.

## Try this scenario

**As the seeker (works on the live demo):**

1. Open the [live demo](https://roomsure-hackathon.vercel.app) → **Continue as Maya (demo)**. Her Passport shows simulated email, ID and card checks.
2. Type what you need in one sentence, e.g. *"I'm interning downtown June 1 to August 15, budget around $900, furnished, with a kitchen."* Claude fills in editable preferences.
3. Swipe the deck. Open **Show the math** on a card, drag a weight slider — the deck re-ranks and the reasons update.
4. Find **Dorm single in Elmhurst** and open its **3D tour**: click the room to capture the mouse, **WASD** to walk, **Shift** to run, **Esc** frees the cursor.
5. Swipe right → simulate the host reply → chat unlocks → **Reserve**. The payment shows up in the Passport.
6. Open **Scam check** and paste the high-risk sample listing — it quotes the exact red flags ("wire the $550 deposit today", "can't show the room"…).

**As the host:**

7. **List your room** → at the *Scan your room from a video* step, download a sample video (kitchen or bathroom) and upload it — the matching pre-built scan attaches to your listing, and publishing puts the tour on your card. The standalone demo page [`/host/index.html`](https://roomsure-hackathon.vercel.app/host/index.html) does the same with a progress bar and a full-screen walkthrough.
8. **Running locally with an API key:** upload *any* 20–30 s room pan instead. The scan service samples 24 frames, fans them out to five Claude analysts, and ~3.5 minutes later you walk a room that did not exist before.

## Architecture

```
browser ── website/  (React + TanStack Start + Tailwind, Vite :5173)
              │  /api proxy
              ▼
          platform/  (Next.js :3000)
              ├─ real accounts & sessions, demo login/reset
              ├─ simulated verification & payments (priced server-side)
              ├─ ranking engine (deterministic, tested) in lib/roomsure/
              └─ Claude routes: /api/intake, /api/check ── Claude API
                                     └─ rule fallbacks when offline
```

**The 3D scan pipeline** (`website/public/scans/room3d/`):

```
phone video (one slow 20–30 s pan)
   │   upload — /host page or the List-your-room scan step
   ▼
scan service  (scan-pipeline/server.mjs, local :8140)
   │   extracts & samples ~24 frames (AVFoundation or ffmpeg)
   ▼
5 Claude analysts in parallel         then 1 merge pass
   architecture & coordinates ·         reconciles everything into
   furniture · materials/colors ·       one validated room spec
   lighting · props/decor
   ▼
rooms/<id>.json — the entire room as a ~10 KB parametric spec
   ▼
three.js viewer — spec-driven rendering, first-person walk,
collision from the spec's furniture footprints
```

Rooms are **specs, not meshes**: a generated room is a small JSON file (`rooms-schema.md` is the contract), so it loads instantly, renders as clean geometry, and can be validated and edited after the fact — no Gaussian splats, NeRFs or GPU reconstruction step. `?room=<id>` on the viewer URL picks the room.

| Folder | What it is |
|---|---|
| `website/` | The product UI (TanStack Start, React, Tailwind; started in Lovable). Talks to the backend through `/api`, falls back to local data if no backend answers. |
| `website/public/scans/room3d/` | The spec-driven 3D room engine, the room specs, and `scan-pipeline/` (generator, prompts, local scan service). |
| `website/public/host/` | Standalone video→3D demo page with the two sample videos. |
| `platform/` | The backend (Next.js): accounts, demo login, simulated verification & payments, Claude intake/scam-check with rule fallbacks, shared ranking logic in `lib/roomsure/`, evals. |
| `ranking/` | Ranking engine docs, tests and an offline `demo.html`; the engine lives in `platform/lib/roomsure/`. |
| `roomwalk/` | First-generation Gaussian-splat room viewer experiment, superseded by the spec-driven engine. |
| `lovable/` | The original Lovable export the UI started from. |

## Running it locally

Use Node 24. Backend first, then the website.

**1. Backend** (`platform/`, port 3000). Copy `.env.example` to `.env.local` and add `ANTHROPIC_API_KEY` for Claude; without a key the rule fallbacks run and the screens say "Read by rules (offline)".

```sh
cd platform && npm ci
APP_URL=http://localhost:5173 npm run dev
```

`APP_URL` must be the website's address — the backend only accepts requests from that origin.

**2. Website** (`website/`, port 5173). Vite proxies `/api` to port 3000.

```sh
cd website && npm install --no-package-lock && npx vite dev --port 5173
```

Open <http://localhost:5173>. (With Bun: `bun install --frozen-lockfile && bun run dev --port 5173`.)

**3. Scan service** (optional — only for generating new rooms from your own videos):

```sh
node website/public/scans/room3d/scan-pipeline/server.mjs
```

It reads `ANTHROPIC_API_KEY` from the environment or from `platform/.env.local`, and serves `POST /api/scan` on port 8140. The upload pages find it automatically.

**Tests:** `cd platform && npm test && npm run test:e2e` (browser tests never call the paid API), `cd website && bun run test`, and `node --test ranking/rankListings.test.ts`.

## Project documents

- [MVP requirements](Roomsure%20MVP%20Requirements%20%28for%20LLM%20build%29.md): scope, behavior, ranking fixtures, acceptance criteria.
- [Architecture](ARCHITECTURE.md): folders, shared types, routes, Claude adapter, deployment.
- [Demo script](demo-script.md): the two-minute path, a pre-demo checklist, backups, and judge Q&A.
- [Scan pipeline](website/public/scans/room3d/scan-pipeline/README.md) and [room spec schema](website/public/scans/room3d/rooms-schema.md): how a video becomes a walkable room.
- [Handoff notes](handoff.md): status and next steps for whoever picks this up.

## Demo limitations

All people, rooms, prices, verification, matching, chat and payments are synthetic or simulated — no real ID, card number or payment is ever collected. Commute times and fair-price baselines are approximate. On Vercel, accounts created during the demo can reset when the server restarts; the demo accounts are always recreated. The app does not fetch real listings, verify a real person, move money, or guarantee that any room is legitimate — and a 3D scan is an inspection aid, not proof of condition.
