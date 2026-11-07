# Roomsure

Roomsure is a hackathon prototype for people who need a room for one to six months. It helps seekers explain what they need, compare rooms against their own trade-offs, inspect a room, and check suspicious listings they found elsewhere.

## Why we are building it

People arranging short-term housing often have to choose between nightly-stay platforms, long leases, and informal listings. The informal options may have useful inventory, but it can be hard to compare fit, understand whether a price is unusual, or spot scam signals.

Roomsure explores a focused answer: make room trade-offs visible, show why a result ranked where it did, and surface warning signs before a seeker decides to proceed. The prototype is for a hackathon demonstration, not a live rental marketplace or a guarantee of safety.

## What the demo shows

- Describe a housing need in plain language and review editable preferences.
- Re-rank seeded Providence rooms as preferences and priorities change.
- Compare the score, explanation, approximate commute, demo fair-price estimate, and trust status.
- Swipe through the same ranked rooms, shortlist likes, and view the attached room video.
- Demonstrate mutual interest and a chat unlock using mocked states.
- Paste an outside listing to see extracted details, scam signals, quoted evidence, and a risk verdict.
- Optionally demonstrate host listing extraction if the core journey is stable.

All people, room details, prices, verification, matching, and chat in the demo are synthetic or simulated. No real ID, driver's license, credit card, deposit, or rental payment should be collected or handled.

## Product principles

1. **The seeker chooses the trade-offs.** Ranking uses a deterministic formula and explains its output.
2. **One ranking powers list and swipe.** The swipe UI is another way to explore results, not a second recommendation engine.
3. **AI assists with text, not decisions.** AI may parse a request or listing; ordinary code validates data and computes rankings/verdicts.
4. **Trust claims stay specific.** A mock badge is not proof of safety; an outside listing stays marked unverified.
5. **Privacy and fairness matter.** Do not use protected traits or collect real identity/payment data in this demo.

## Project documents

- [Hackathon MVP requirements](Roomsure%20MVP%20Requirements%20%28for%20LLM%20build%29.md): implementation scope, behavior, data, architecture, and acceptance criteria.
- [Technical architecture](ARCHITECTURE.md): system boundaries, data strategy, diagrams, contracts, request flows, and deployment guidance.
- [Master build prompt](MASTER_PROMPT.md): instructions for a coding LLM or teammate implementing the project.
- [Pitch deck](Roomsure%20Pitch%20Deck.pptx) and [HTML prototype](Roomsure%20Prototype.html): story and visual references.
- `Roomsure MVP Requirements (for LLM build).docx`: original source specification.

## Suggested technology

Use one Next.js App Router application with React, TypeScript, and Tailwind CSS. Keep listings in local JSON for the demo. Run deterministic ranking in the browser so slider and priority changes are immediate. If AI is used, call it from a server route, validate its JSON, and keep provider keys on the server. The core demo must work with no AI provider configured.

Use the supplied room videos as static assets or stable URLs and attach them by listing ID. A true 360° asset needs a compatible viewer; do not label ordinary video as 360°.

## Team ownership

- **Integration/app lead:** app shell, shared types, integration, deployment and rehearsal.
- **Ranking/data:** formula, seed listings, scores, explanations and result list.
- **Swipe/video:** swipe deck, shortlist, room detail and video playback.
- **AI/trust:** intake, scam evidence, optional AI provider and demo verification/chat states.

Agree on shared `Listing`, `Preferences`, and `RankedRoom` types before splitting implementation. List, swipe, detail, and shortlist should use the same ranked result data.

## Build status and running locally

The repository currently contains product documents and a standalone HTML prototype; the application scaffold has not yet been created. Once the Next.js app exists, document its exact setup commands here. Do not assume a command or environment variable exists until it is added to the project.

## Demo limitations

The app uses synthetic inventory, mocked verification and chat, approximate commute values, and demo fair-price baselines. It does not fetch or scrape real listings, verify a real renter or host, process money, hold deposits, or guarantee that a room is legitimate.


