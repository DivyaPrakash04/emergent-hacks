# Roomsure Hackathon MVP Requirements

**Status:** Working build specification  
**Product:** Roomsure — short-term room matching for stays of 1–6 months  
**Audience:** Hackathon team and coding assistants

This is the practical implementation spec for the Roomsure hackathon demo. It preserves the useful ranking, fair-price, trust, scam-check, AI-contract, seed-data, and acceptance ideas from the original requirements while focusing the build on one complete, judge-ready journey. The original DOCX remains available as source material.

## 1. Product goal

Build a polished, functional web demo that helps a seeker find a suitable short-term room and assess whether a listing looks suspicious.

**Product promise:** Describe what matters to you; Roomsure ranks rooms by your trade-offs, explains the ranking, and helps you inspect a room before expressing interest.

The demo should make these ideas clear:

1. The seeker controls the trade-offs; the ranking is deterministic and explainable.
2. The same ranked results power list and swipe experiences.
3. The room video helps the seeker inspect a shortlisted room; it does not change the ranking.
4. Trust badges communicate specific demo checks and limitations.
5. Pasted outside listings are analyzed but remain unverified by Roomsure.

## 2. Scope and priorities

### P0: Must work for the live demo

- Responsive seeker experience with seeded synthetic Providence listings.
- Text intake that fills editable preferences: price ideal/limit, commute ideal/limit, dates, and furnished preference.
- Editable preferences and reorderable priorities; changing either reranks locally and immediately.
- Ranked room cards with score, score reason, estimated commute, fair-price label, trust status, and a clear demo-data label.
- Swipe deck using the exact same ordered result set as the list; pass/like actions work.
- Liked rooms appear in a shortlist; a shortlisted listing can open its detail and attached video.
- Video playback works with the supplied media. If a true 360-degree asset requires a dedicated viewer, provide that viewer; otherwise show the available clip with an honest label and graceful fallback.
- Interest from both sides unlocks a clearly mocked chat state. No real messages are sent.
- Scam checker accepts pasted text, identifies basic listing fields and scam signals, shows the exact evidence phrase, and labels the result “Outside · not verified”.
- Verification states are simulated. Clearly state no ID, license, or card details are collected.
- App remains usable when AI is unavailable through a deterministic local fallback.

### P1: Add only after P0 is stable

- Host paste-to-listing extraction and review form.
- A simple host accept/pass control to demonstrate mutual match.
- More seeded listings and additional outside-listing examples.
- Optional provider selection for cloud/local AI when both are already available.

### Explicitly out of scope

- Real ID/license collection or identity-verification provider integration.
- Real card checks, charges, deposits, escrow, or payment handling.
- Real-time chat, production authentication, production database, leases, or e-signatures.
- Live rental inventory, third-party scraping, or automatic access to classified/social sites.
- Applicant ranking, complex host dashboard, learned ranking weights, trust graph, photo hashing, maps, or routing API.
- Any claim that a badge or score guarantees a person, room, price, or transaction is safe.

## 3. Demo journey and screens

### Primary seeker journey

1. **Sign-up/demo verification:** Use demo persona selection or simple demo login. Show mock email, identity, and card-check states with “Demo only” labeling. Do not present actual document or card fields.
2. **Describe needs:** Seeker enters a natural-language request. Display extracted preferences and ask a short follow-up only when a required value is missing or ambiguous.
3. **Review preferences:** Show ideal and walk-away price and commute values, dates, furnished preference, and priority order. The user can edit each value.
4. **Ranked results:** Show a compact list with rank, score, trade-off explanation, approximate commute, fair-price note, trust badge, and “View / Like” actions.
5. **Swipe:** Present the same results in the same order. A swipe or button marks pass/like. Show deck progress and allow access to liked rooms.
6. **Shortlist/detail/video:** Shortlisted room opens a detail view with score breakdown, room facts, host trust reason, and associated video. Explain that video viewing does not certify the listing.
7. **Mutual interest:** Demo host acceptance can make a match state and unlock a mock-chat screen. Show “Chat demo — no real messages”.
8. **Outside listing check:** A separate tab accepts pasted listing text and shows extracted facts, signals, quoted evidence, fair-price estimate where possible, verdict, and “Outside · not verified”.

The two-minute presentation should prioritize steps 2–4, one swipe/shortlist/video, and one suspicious-listing check. Do not narrate every screen.

### Host extraction (P1)

If implemented, host pastes a listing post, receives a draft with confidence/missing fields, edits it, previews the seeker card, and publishes to the local demo data for the current session. Clearly label publishing as demo-only.

## 4. Ranking and matching requirements

Implement a pure TypeScript function, for example `rankListings(preferences, listings)`. It must be deterministic, run client-side, and be the only source of displayed ranking scores. Do not ask an LLM to rank listings or invent score explanations.

### Hard filters

Exclude and explain a listing when any condition applies:

- Price exceeds the seeker's maximum.
- Commute exceeds the seeker's maximum.
- Uncovered days exceed the allowed gap.
- A hard requirement is violated (e.g. private room required but listing is shared; no-smoking required but smoking is allowed).
- Listing or host is suspended.

Keep excluded listings and reasons in a “Filtered out” section when useful for the demo. Suspended listings must never appear among results.

### Satisfaction functions

For a lower-is-better value `x`, ideal `t`, and maximum `L`:

- `s(x) = 1` when `x <= t`
- `s(x) = 1 - (x - t) / (L - t)` when `t < x <= L`
- Clamp to `[0, 1]`; handle `L <= t` without division by zero.

Dimensions for the hackathon score:

- **Price:** monthly price; ideal and limit in USD.
- **Commute:** approximate minutes; ideal and limit in minutes.
- **Dates:** uncovered days; ideal is 0, limit is user's allowed gap.
- **Space:** share of requested nice-to-haves present (initially furnished; private bath can be included if data/UI supports it). If no nice-to-have is requested, score 1.

Lifestyle compatibility, demographic traits, and inferred protected traits are excluded from scoring. No race, religion, gender, disability, national origin, family status, or proxies for these traits may be collected or used for ranking.

### Weights and score

For `n` ranked dimensions, priority position `i` (starting at 1) receives weight `(n - i + 1) / (n * (n + 1) / 2)`. With four priorities, weights are `0.4, 0.3, 0.2, 0.1`.

`score = round(100 * trustFactor * sum(weight[dimension] * satisfaction[dimension]))`

Trust factors for ranking: verified network listing `1.0`; caution network listing `0.85`; outside listing `0.7`. Suspended is filtered, not scored. Sort by score descending, then lower price ascending. Show component satisfaction and weights on the detail screen.

Commute values may be seeded approximate minutes for the demo. If coordinates are used, apply the documented straight-line estimate consistently and label it approximate; no routing API is required.

### Score fixture

Use the formula above as the source of truth. In the original sample fixture (priorities price > commute > dates > space; Room A price $950, commute 25, 0 gap, furnished; ideal/limits $900/$1050 and 20/35), Room A calculates to **77**. Room D ($1,000, 12 min, 0 gap, furnished) calculates to **73**. Room B calculates to **54**. Room C at $1,100 is filtered. Update any displayed fixture values to match the formula; never hardcode inconsistent sample scores.

## 5. Fair-price and scam checks

### Fair-price estimate

Use an explicitly labeled synthetic baseline by neighborhood for an unfurnished private room. Adjust midpoint by `1.10` if furnished, `1.10` if private bath, and `1.05` for a stay under three months. Fair range is midpoint times `[0.88, 1.12]`.

Labels:

- Within range: “Fair price · demo estimate”.
- Up to 30% below the low end: “Good deal · demo estimate”.
- More than 30% below low end: “Unusually low · demo estimate” and add `price_far_below_fair`.
- Above range: show approximate percent above fair, neutrally.

This is a comparison aid, never a guarantee or a definitive verdict. When neighborhood or room type is unknown, say estimate unavailable rather than inventing a precise range.

### Scam signals

Run simple rules over all demo listings and pasted outside text. Signals:

- `price_far_below_fair`: rule above; medium severity.
- `payment_pressure`: text asks for wire, gift card, crypto, payment app, or deposit before viewing; high severity.
- `cannot_view`: owner abroad, cannot show room, keys mailed; medium severity.
- `urgency`: pressure such as “pay today” or “many people interested”; low severity.
- `off_platform_contact`: explicit phone/email/text-me contact; low severity.

Every text-based signal must include a short exact quoted evidence phrase. Do not claim that an LLM detected evidence unless it returned that phrase from the input. Use rule-based checks as fallback. Duplicate-photo detection is deferred.

Verdict rules:

- Any high signal or at least two medium signals: **High risk**.
- One medium signal or low signals only: **Caution**.
- No detected signal: **No issues found**; never say “safe” or “verified”.

## 6. AI and fallback behavior

AI assists with understanding text; deterministic code validates and computes results.

- Intake input: free text, with demo/current date supplied explicitly.
- Intake output: partial preferences, confidence/missing fields, and up to two concise follow-up questions. Never invent missing details. One budget value may become ideal with a suggested 15% maximum, clearly disclosed for user confirmation.
- Listing extraction input: pasted text. Output: partial structured fields, confidence per field, and missing fields. Only extract what is stated.
- Scam-check output: known signal IDs and exact quoted evidence phrases.
- Validate all model output against a schema before using it. Ignore protected traits and do not store them.
- Keep provider keys on the server. A local model can be an alternate provider only if it is already available and reachable from the machine running the app. The UI must work when both cloud and local providers fail.
- Fallback intake should use a small deterministic parser for the demo sentence or leave unknown fields editable and ask the user. Fallback scam detection uses local rules. Ranking never depends on an AI call.
- Avoid an AI-provider setup task blocking the P0 user journey. Clearly identify simulated or fallback behavior in the UI.

## 7. Data, media, and technical architecture

### Suggested architecture

- Next.js App Router, React, TypeScript, Tailwind CSS.
- One application/codebase; no separate microservices.
- Seed listings in local JSON; demo preferences, swipes, shortlist, and host acceptance in client state/local storage as appropriate.
- Pure TypeScript ranking module, shared by list and swipe views.
- Server route handlers for AI intake, extraction, and optional explanation; schema-validate responses.
- No production DB/auth required. Do not add a service that is unnecessary for a rehearsed demo.

### Suggested folders

```text
app/                 routes and page composition
components/          shared cards, controls, swipe, shortlist, video UI
lib/ranking/         deterministic ranking and score explanations
lib/scam/            fair-price and scam-signal rules
lib/ai/              provider interface, schemas, fallbacks
 data/                synthetic Providence seed listings and fair baselines
public/videos/        approved demo room clips
public/images/        posters and demo listing images
```

### Listing data minimum

Every listing needs a stable ID, title, demo host ID/name, neighborhood (not a private exact address), monthly price, availability dates, room type, furnished/private-bath flags, house rules relevant to hard filters, trust status/reason, fair-price baseline key, approximate commute to the selected demo destination, demo source label, and optional video/poster URLs.

Create roughly 20–25 synthetic listings if time permits; at minimum create enough varied records to demonstrate ranking, filtering, fair-price differences, caution status, and video association. Include 3 suspicious examples, 2 consent-pending sublets, and 1 suspended listing in the seed set; the suspended one must be hidden from results. Synthetic hosts and addresses must not impersonate real people or expose private addresses.

### Video handling

- Associate video and poster URLs by stable listing ID.
- Use supplied local assets or stable hosted URLs; no upload platform is required.
- Provide a poster, loading state, playback error state, and non-video detail fallback.
- Confirm with the media owner whether the asset is ordinary video or equirectangular 360 video. A genuine 360 experience needs a compatible viewer; do not label an ordinary clip as 360°.
- Video is an inspection aid, not proof that the listing is genuine or currently available.

## 8. Interface and accessibility

- Mobile-first, clean, consistent visual style based on the existing `Roomsure Prototype.html` reference.
- Keep “Demo data” visible in the experience and put “Simulated” beside mock verification, host actions, and chat.
- Make score and why text readable without opening a detail screen.
- Swipe has visible pass/like buttons as alternatives to gestures.
- Include keyboard focus states, semantic buttons, labels for form controls, and reduced-motion support.
- Do not show suspended/red listings in results. Explain caution reasons in plain language.
- Outside listing checker always says “Outside · not verified by Roomsure.”

## 9. Team work split and integration contract

For a four-person team:

1. **Integration/app lead:** app shell, navigation, shared types, setup/deploy, integration, demo rehearsal.
2. **Ranking/data:** seed listings, formulas, score breakdown, list results and filtered reasons.
3. **Swipe/video:** swipe deck, actions, shortlist, room detail, video player/fallback.
4. **AI/trust:** intake, scam-check UI and rules, optional server AI provider, verification/chat mock states in coordination with integration lead.

Agree first on shared `Listing`, `Preferences`, and `RankedRoom` types. `RankedRoom` carries the listing, score, dimension satisfaction/weights, explanation, fair-price result, and trust status. List, swipe, detail, and shortlist consume the same ranked results. Integrate each slice early; avoid parallel implementations of the score formula.

## 10. Acceptance criteria

- Demo seeker sentence fills price, commute, dates, and furnished preference, or clearly asks for missing information.
- Editing any slider or priority immediately changes scores/order without reload; ranking formula is deterministic.
- Score fixture matches the formula: A=77, D=73, B=54, C filtered for price.
- List and swipe show the same room order and score.
- Like/pass works; liked rooms are available in shortlist; a selected room opens the correct video or a clear fallback.
- Mock mutual interest unlocks a mock chat state; no real chat or payment is implied.
- Scam checker returns the quoted triggers for the suspicious example and a High risk verdict; it labels the listing outside and unverified.
- Each visible result has score, explanation, fair-price note, and trust badge/reason.
- Suspended listings never appear in results.
- App can complete the demo without cloud/local AI availability.
- No real identity or payment information is requested or stored.
- No protected traits are present in forms, prompts, data, or ranking logic.
- Video errors do not block navigation or the rest of the demo.

## 11. Build order

1. Agree shared types, seed-data format, and routes; scaffold the app.
2. Implement ranking + score fixture + result cards and filtered list.
3. Add preferences intake/edit controls and live reranking.
4. Add swipe, shortlist, detail, and video/fallback.
5. Add scam check and evidence; add fair-price and trust labels.
6. Add mock mutual match/chat and mock verification labels.
7. Add AI provider(s) and host extraction only after fallback journey works.
8. Polish responsive layout, integrate, rehearse the two-minute demo, and prepare a backup recording/screenshots.

**Guardrail:** when time is short, reduce feature count, not clarity or demo reliability.


