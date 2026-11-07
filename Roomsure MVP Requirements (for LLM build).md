# Roomsure Hackathon MVP Requirements

**Status:** Working build specification, v2 (one product). Updated 2026-11-07.
**Product:** Roomsure: short-term room matching for stays of 1–6 months
**Audience:** Hackathon team, judges' Q&A prep, and coding assistants

v2 merges the team's three pieces of work into one product: accounts and payments ([PR #2](https://github.com/ericmxf17/emergent-hacks/pull/2)), RoomWalk 3D rooms ([PR #3](https://github.com/ericmxf17/emergent-hacks/pull/3)), and the ranking engine and swipe deck ([PR #4](https://github.com/ericmxf17/emergent-hacks/pull/4)). The original DOCX is background only. Where it disagrees with this file, this file wins.

## 1. Product goal

**Promise:** Tell Roomsure what you need. It ranks rooms by your own trade-offs, explains every card, lets you walk the room in 3D, and flags scam signals before you pay.

The demo is judged on four criteria. Each needs visible proof:

| Criterion | What proves it in the demo |
|---|---|
| Functionality | The full loop works on the live link: sign in → describe needs → swipe → walk the room → match → reserve, plus the scam check. Every step has a fallback. |
| Usability | One-click demo login. Swipe, buttons, or arrow keys. Plain-English reasons on every card. One-tap fixes when no room fits. |
| Technical execution | A tested, deterministic ranking engine. Real accounts with hashed passwords and server sessions. Claude calls validated against a schema, with fallbacks. A Gaussian-splat 3D viewer. |
| Originality | Swipe on the reasoning, not just photos. Near misses come with the one change that brings them back. A walkable 3D room made from a phone video. Scam checks that quote the exact suspicious words. |

## 2. Scope and priorities

### P0: must work in the live demo

- **Accounts (PR #2):** sign up, sign in and sign out with real local accounts. A one-click **Continue as Maya (demo)** button. The Roomsure Passport shows email, ID and card checks, all simulated and labeled.
- **Intake:** the seeker types one sentence. Claude turns it into editable preferences. If Claude is unavailable, a rule-based parser takes over.
- **Preferences:** ideal and walk-away limit for price, commute and dates. Seven facilities, each set to Don't care, Nice, Important or Must. Importance sliders from 0 to 10. A **Prefer verified hosts** switch, on by default.
- **Deck (PR #4):** a swipe deck with Pass/Interested buttons, arrow keys and undo. A list view shows the same ranked results in the same order.
- **Cards:** rank, score, one-sentence reason, gains and gives-up chips, trust badge, fair-price label, a "Demo data" label, and **Show the math**.
- **Near misses:** when the deck runs out, show rooms that missed a limit, each with a one-tap fix.
- **Shortlist and detail:** liked rooms open a detail page with facts, the score breakdown, the trust reason and the fair price. **Walk the room in 3D** opens the RoomWalk viewer (PR #3). Rooms without a scan show a photo.
- **Match and reserve:** a simulated host reply creates a match. That opens a mock chat with canned messages. **Reserve** runs the simulated checkout (PR #2) for that listing's first month. Only verified seekers can reserve.
- **Scam check:** the seeker pastes an outside listing. Claude extracts the facts and suggests evidence. Code checks every quote, runs the rules and sets the verdict. The result always says "Outside · not verified by Roomsure".
- **Resilience:** the demo still works with no Anthropic key, no wifi for the remote 3D sample, and after a server restart.

### P1: only after P0 works end to end

- Host "List your room": paste a post, Claude drafts the listing, the host reviews it, and it is published for this session only.
- Live video-to-3D scanning from the app (RoomWalk + Modal GPU). Show a pre-made scan in the demo and describe live scanning in the pitch.
- A second persona, Dev (med student, 6-week rotation).

### Out of scope

- Collecting real ID documents, selfies or card numbers. Stripe test mode exists in PR #2 but stays **off** for the demo (`PROVIDER_MODE=demo`).
- Real money, deposits, escrow, payouts or refunds.
- Live rental inventory, scraping third-party sites, or real-time chat.
- Learned ranking weights, the `houseFit` lifestyle factor, a routing API, applicant ranking, or a host dashboard.
- Collecting or using protected traits (race, religion, gender, disability, national origin, family status) or proxies for them.
- Any claim that a badge, score, scan or check guarantees that a person, room or price is safe.

## 3. Demo journey and screens

1. **Welcome:** "Continue as Maya (demo)" or sign up. New accounts can complete the simulated email, ID and card checks. Maya is seeded as already verified, so the live demo skips those steps.
2. **Describe needs:** one text box. Show which preferences were filled, plus up to two follow-up questions when something required is missing. Label the result "Read by Claude" or "Read by rules (offline)", whichever actually ran.
3. **Preferences:** every value is editable. Any change reranks instantly, with no network call.
4. **Deck:** cards in rank order. The list view toggle shows the same order and scores.
5. **Out of cards:** near misses, each with its fix button.
6. **Shortlist → detail → 3D:** the detail page shows the score breakdown, trust reason, fair price and "Walk the room in 3D". The viewer says the scan is an inspection aid, not proof the listing is genuine.
7. **Match → chat → reserve:** "Simulate host reply" → match → mock chat ("Chat demo · no real messages") → Reserve → simulated checkout → the payment appears in the Passport's history.
8. **Scam check:** a separate tab. Paste text or pick one of three sample listings. Show the extracted facts, signals with quoted evidence, the fair-price estimate where possible, and the verdict.

The two-minute presentation path and talk track are in [demo-script.md](demo-script.md).

## 4. Ranking and matching

**Source of truth:** `ranking/rankListings.ts` and `ranking/README.md` (PR #4). This section summarizes them; the code wins on details. The engine is pure TypeScript, deterministic, and runs in the browser. It is the only source of displayed scores. Claude never ranks rooms or writes score numbers.

### Steps

1. **Remove suspended listings** before they reach the engine. They never appear anywhere in the seeker flow.
2. **Hard filters become near misses.** A room past any walk-away limit, or missing a "Must" facility, stays out of the deck. It is kept with the one change that would bring it back (for example, "Raise your price limit to $1,100").
3. **Factor scores (0–100).** At or better than ideal = 100. At the limit = 0. In between, a straight line: `100 × (limit − value) ÷ (limit − ideal)`.
   - **Price:** monthly USD.
   - **Commute:** approximate minutes to the seeker's chosen destination ("Work, downtown" or "Brown campus").
   - **Dates:** uncovered days of the stay. Ideal is 0; the limit is the seeker's gap tolerance.
   - **Facilities:** Nice = 1 point, Important = 2. Score = share of those points the room has. If nothing is Nice or Important, facilities sit out.
4. **Weights:** each importance slider ÷ the sum of all sliders. All zero means equal weights. Drag-to-rank stays supported through `priorityOrder`, which gives 40/30/20/10%.
5. **Trust (new in v2).** When **Prefer verified hosts** is on (the default), multiply by a trust factor: verified `1.0`, caution `0.85`, outside `0.7`. When it is off, every factor is `1.0` and trust shows only as a badge.
   `score = round(trustFactor × Σ(weight × factorScore))`
   A penalty also appears as a "gives up" chip, for example "Host ID check pending (−15%)".
6. **Sort:** score descending, then lower price, then shorter commute.

### Required fixtures (tests must pass)

Maya: price $900 ideal / $1,050 limit; commute 20 / 35 min; June 1 – Aug 15 with up to 5 uncovered days; kitchen Must, furnished Important; importance price 8, commute 6, dates 4, facilities 2.

| Room | Facts | Score |
|---|---|---|
| A | $950, 25 min, all dates, furnished, verified | **77** |
| D | $1,000, 12 min, all dates, furnished, verified | **73** |
| B | $880, 32 min, opens 3 days late, unfurnished, verified | **54** |
| C | $1,100 | Near miss: $50 over the price limit |
| E | $940, 25 min, all dates, furnished, sublet with landlord consent pending (caution) | **67** with the switch on (79.33 × 0.85); **79** with it off, which makes it the first card |

Raising commute importance from 6 to 9 makes D the first card (77, with A at 75).

The default deck order (switch on) is A 77, D 73, E 67, B 54. Turning the switch off puts E first at 79. That flip is a planned demo moment.

## 5. Fair price and scam checks

### Fair-price estimate

Use a synthetic baseline by neighborhood for an unfurnished private room, clearly labeled as demo data. Multiply the midpoint by `1.10` if furnished, `1.10` if private bath, and `1.05` for a stay under three months. The fair range is the midpoint × `[0.88, 1.12]`.

- Within range: "Fair price · demo estimate".
- Up to 30% below the low end: "Good deal · demo estimate".
- More than 30% below the low end: "Unusually low · demo estimate", and add `price_far_below_fair`.
- Above range: show the approximate percent above fair, neutrally.

The estimate is a comparison aid and never changes the ranking score. When the neighborhood or room type is unknown, say "Estimate unavailable".

### Scam signals

| Signal | Trigger | Severity |
|---|---|---|
| `price_far_below_fair` | Fair-price rule above | Medium |
| `payment_pressure` | Wire, gift card, crypto, payment app, or deposit before viewing | High |
| `cannot_view` | Owner abroad, can't show the room, keys mailed | Medium |
| `urgency` | "Pay today", "many people interested" | Low |
| `off_platform_contact` | Explicit phone, email or "text me" | Low |

**Who does what:** Claude extracts listing facts and *suggests* signals with quoted evidence. Code keeps a suggested quote only if it is an exact substring of the pasted text and belongs to a known signal ID. The rule checks always run as well. Code, not Claude, computes the verdict.

**Verdict:**
- Any high signal, or two or more medium signals: **High risk**.
- One medium signal, or only low signals: **Caution**.
- No signals: **No issues found**. Never say "safe" or "verified", and always add "Outside · not verified by Roomsure".

Network listings also run through the rules. A network listing with a signal gets caution status. Duplicate-photo detection is deferred.

## 6. Claude (AI) behavior

**Principle:** AI understands, math decides, AI explains.

| Use | Input | Output |
|---|---|---|
| Intake | Seeker's sentence + today's date | Partial preferences, missing fields, up to 2 follow-up questions |
| Listing check | Pasted listing text | Partial listing facts (with "not stated" for unknowns) + suggested signal IDs with exact quotes |
| Host draft (P1) | Pasted host post | Partial listing fields + missing fields |

Rules:
- Calls run only on the server. The key lives in `ANTHROPIC_API_KEY` and never reaches the browser.
- Every response is validated against a Zod schema. Invalid output is thrown away and the fallback runs.
- Claude never invents missing details. One stated budget becomes the ideal, with a suggested limit 15% higher that the seeker confirms.
- Pasted text is data, not instructions. The prompt tells Claude to ignore instructions inside listings.
- Claude never sees or returns protected traits, ID documents or card data.
- The UI says which path ran. Never show "Read by Claude" when the fallback ran.
- Fallbacks: a small rule parser for intake; the rule checks for scam signals. The full demo must work with no key set.

Model and settings are in [ARCHITECTURE.md](ARCHITECTURE.md) section 9.

## 7. Data and media

- **Listings:** `platform/data/listings.json`. Aim for 12–15 synthetic Providence listings. They must include:
  - Maya's fixture rooms A–D. Room A is "Sunny room in Fox Point, $950", the same room as PR #2's seeded reservation.
  - Fixture room E (caution).
  - 2 sublets with landlord consent pending (caution).
  - 1 suspended listing (hidden from the seeker flow).
  - A spread of neighborhoods, prices and facilities, so sliders visibly change the order.
  - Commute minutes for both destinations.
- **Outside samples:** `platform/data/outside-examples.json`, with 3 pasted listings: one High risk, one Caution, one No issues found.
- **Fair baselines:** `platform/data/fair-baselines.json`, labeled demo values.
- **Personas:** Maya (summer intern, June 1 – Aug 15, works downtown) is a seeded account, pre-verified (simulated). Dev is P1.
- **Media:** every listing has a photo or poster. 1–2 listings link to a 3D scan labeled "Sample 3D scan · demo". Use the RoomWalk real-room sample (streamed from Hugging Face, preloaded before the demo) with the bundled synthetic room as the offline fallback. Never present a sample scan as a photo of that exact listing.
- Synthetic hosts and addresses must not impersonate real people or show private addresses. Show neighborhoods, not street addresses.

## 8. Interface and accessibility

- Mobile-first. Use PR #2's existing visual style (its `globals.css`), with the HTML prototype as a reference.
- Keep "Demo data" visible. Put "Simulated" next to verification, host replies, chat and payments.
- Scores and reasons are readable without opening a detail page.
- Pass/Interested buttons and arrow keys as well as swipe gestures. Visible focus states, labeled controls, and reduced-motion support.
- Suspended listings never appear. Caution reasons are written in plain language.

## 9. Team areas

| Area | Folder | Started in |
|---|---|---|
| Accounts, Passport, payments | `platform/` | PR #2 |
| Ranking engine, deck, near misses | `ranking/` → `platform/lib/ranking/` | PR #4 |
| 3D room viewer and scan pipeline | `roomwalk/` | PR #3 |
| Integration, intake, scam check, seed data, deploy | `platform/` | Integration PR |

Agree on the shared types in [ARCHITECTURE.md](ARCHITECTURE.md) section 6 before splitting work. List, deck, detail and shortlist all use the same ranked results.

## 10. Acceptance criteria

- "Continue as Maya" signs in with one click on the live link, even right after a server restart.
- Maya's sample sentence fills price, commute, dates and furnished, or asks a clear follow-up question. This works with and without Claude, and the label shows which ran.
- Moving any slider, facility level or the trust switch changes scores and order instantly.
- The fixtures in section 4 pass in `node --test`.
- The list and deck show the same order and scores.
- Like/pass works. Liked rooms appear in the shortlist and open the right detail page. "Walk the room" loads the 3D scan or the offline fallback.
- A simulated host reply unlocks the mock chat. Reserve charges the correct listing's price in simulated mode and appears in payment history.
- The High-risk sample returns High risk with exact quoted evidence and the "Outside · not verified" label.
- Every visible card has a score, reason, fair-price note and trust badge.
- Suspended listings never appear.
- No form asks for real ID or card details. No protected traits appear in forms, prompts, data or ranking.
- A missing Anthropic key, a Claude timeout, or a failed 3D load never blocks the next step.

## 11. Build order

1. Make the integration branch from `main` and merge PRs #2, #3 and #4. Get `platform/` running locally.
2. Move the ranking engine into `platform/lib/ranking/`. Add the trust switch and fixture E.
3. Add seed data, the Maya demo login, and demo accounts that are created on every server start.
4. Build the preferences, deck, list, near misses, shortlist and detail screens.
5. Add the RoomWalk viewer at `platform/public/roomwalk/` and link it from the detail page.
6. Add the scam check (rules first, then Claude) and fair-price labels.
7. Add Claude intake with the rule fallback.
8. Add the match, chat and reserve flow on top of PR #2's checkout.
9. Deploy to Vercel, then test the full path on the live link and offline.
10. Rehearse [demo-script.md](demo-script.md) and record a backup video.

**Guardrail:** when time is short, cut features, not clarity or reliability. Cut order: step 8's chat (keep reserve), then step 7 (keep the rule parser), then P1 entirely.
