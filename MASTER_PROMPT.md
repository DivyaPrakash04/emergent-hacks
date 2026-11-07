# Roomsure Master Build Prompt

Copy this prompt into a coding LLM after opening the Roomsure repository. The requirements file is the source of truth for product behavior. `ARCHITECTURE.md` is the source of truth for structure.

---

You are building **Roomsure**, a hackathon web app for finding and checking short-term rooms (one to six months). Work in the existing repository. First inspect its files, branches and open pull requests. Preserve teammates' work; never overwrite or discard it.

## Read these first

1. `README.md`: product summary and repository map.
2. `Roomsure MVP Requirements (for LLM build).md`: scope, behavior, fixtures, acceptance criteria.
3. `ARCHITECTURE.md`: folders, types, routes, Claude adapter, deployment.
4. `demo-script.md`: the two-minute path the build must support.
5. `ranking/README.md` (engine), `platform/README.md` (accounts and payments), `roomwalk/README.md` (3D viewer).

If these conflict, follow the requirements for behavior and `ARCHITECTURE.md` for structure. A newer direct instruction from the team overrides both; update the docs to match.

## What already exists

- `platform/`: a Next.js 16 app with real accounts, sessions, a Passport, simulated ID and card checks, and a simulated $950 checkout (PR #2).
- `ranking/`: a pure TypeScript ranking engine with passing tests and an offline swipe demo (PR #4).
- `roomwalk/`: a first-person Gaussian-splat viewer with a demo room, plus a video-to-3D scan pipeline for cloud or local GPUs (PR #3).

- `lovable/`: the rules and prompts the team uses to design the UI in Lovable. The Lovable repo is mirrored into the `lovable-ui` branch. Port those screens; don't redesign them.

Your job is to join these into one app in `platform/`, not to rebuild them.

## Product outcome

One responsive journey on the live link:

**Continue as Maya → describe needs (Claude or rules) → edit preferences → swipe the ranked deck (or list) → near misses with fixes → shortlist → detail with score math → walk the room in 3D → simulated host reply → mock chat → simulated reserve**

Plus a separate **paste outside listing → facts, quoted evidence, verdict** check.

## Non-negotiables

- Accounts are real. ID, card, email delivery and payment results are **simulated** (`PROVIDER_MODE=demo`). Never add form fields for real ID documents, selfies or card numbers.
- The ranking engine is the only source of scores. Claude never ranks, scores or decides a scam verdict.
- Claude runs server-side only, with Zod-validated output, an 8-second timeout, no retries, and a rule fallback. The UI says which path ran.
- Prices for checkout come from server-side seed data, never from the client.
- Suspended listings never appear in the seeker flow.
- Outside listings always say **Outside · not verified by Roomsure**. "No issues found" is never "safe".
- Sample 3D scans are labeled "Sample 3D scan · demo". A scan is an inspection aid, not proof.
- No protected traits in forms, prompts, data or ranking. No scraping of third-party sites.
- Label demo data, simulated checks, host replies, chat and payments as such.

## Priorities

### P0 (in this order)
1. Integration branch: merge PRs #2, #3 and #4; get `platform/` running.
2. Done: the engine lives in `platform/lib/roomsure/` with the trust switch (`preferVerified`) and fixture E. Keep all tests passing.
3. Seed data is in `platform/lib/roomsure/data/`. Add demo accounts created at startup, `demo/login` and `demo/reset` routes.
4. Rooms page: intake box, preferences, deck and list, near misses.
5. Detail page: score math, trust and fair price, the RoomWalk overlay, then match → chat → reserve.
6. Scam check page: rules first, then Claude assist.
7. Claude intake with the rule fallback.
8. Vercel deploy and a full run-through on the live link and on the laptop.
9. Evaluation (requirements section 12): a Playwright test of the whole demo path, a hallway test, and, if time allows, the Claude accuracy check in `platform/evals/`.

### P1 (only after P0 works end to end)
Host "List your room" draft, live video-to-3D scanning, and a second persona.

## Working method

1. Report the current branches, stack and constraints before broad changes.
2. Make small, reviewable commits. Keep imports explicit and module boundaries clear (`ARCHITECTURE.md` section 3).
3. Run `npm test` and `npm run build` in `platform/`, and `node --test` for the ranking fixtures, before calling a step done.
4. Check the journey in a browser at phone and desktop widths.
5. Report exactly which checks ran and what failed. Never claim a check you did not run.
6. Summarize the changed files, the behavior, the known limits and the next task.

## Ready for the demo when

All acceptance criteria in section 10 of the requirements pass on the production link. The demo script runs in under two minutes. The laptop backup and recording are ready.
