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
| `platform/` | **The app.** Next.js, real accounts and sessions, Passport, simulated verification and payments. Rooms, detail, 3D and scam check are added here. | [PR #2](https://github.com/ericmxf17/emergent-hacks/pull/2) |
| `ranking/` | Ranking engine docs, tests and the offline `demo.html`. The engine itself now lives in `platform/lib/roomsure/`. | [PR #4](https://github.com/ericmxf17/emergent-hacks/pull/4) |
| `roomwalk/` | 3D room viewer source and the video-to-3D scan pipeline (Modal or local GPU). The viewer is copied into `platform/public/roomwalk/`. | [PR #3](https://github.com/ericmxf17/emergent-hacks/pull/3) |

## Product principles

1. **The seeker chooses the trade-offs.** A deterministic formula ranks rooms and explains every score. Trust is one of the seeker's settings ("Prefer verified hosts"), not a hidden thumb on the scale.
2. **One ranking powers everything.** Deck, list, shortlist and detail all show the same results.
3. **AI understands, math decides.** Claude reads sentences and listings. Code computes scores and scam verdicts, and every path has a non-AI fallback.
4. **Trust claims stay specific.** A simulated badge is not proof of safety. A 3D scan is an inspection aid. Outside listings are always "not verified by Roomsure".
5. **Privacy and fairness.** No protected traits in matching. No real identity or payment data in the demo.

## Running it

**Current status (2026-11-07):** each piece runs on its own branch until the integration PR merges.

- Accounts app (PR #2): `cd platform && npm ci && cp .env.example .env.local && npm run dev`, then open http://localhost:3000. Needs Node 24+.
- Ranking demo (PR #4): double-click `ranking/demo.html`. Tests: `node --test ranking/rankListings.test.ts`.
- RoomWalk viewer (PR #3): `cd roomwalk/viewer && python3 serve.py`, then open http://localhost:8000.

**After integration:** `cd platform && npm ci && cp .env.example .env.local && npm run dev`. Add `ANTHROPIC_API_KEY` to `.env.local` for Claude; without it, the rule fallbacks run. Deployment steps are in [ARCHITECTURE.md](ARCHITECTURE.md) section 12.

Use Node 24 everywhere.

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
