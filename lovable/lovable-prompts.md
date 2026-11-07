# Roomsure: Lovable prompts

How we build the UI. Lovable designs every screen on top of the real ranking engine and demo data. Claude Code then ports the result into `platform/` and connects the real backend.

## How it works

1. **Prompt 1** in a new Lovable project builds the look, the app shell and the Welcome page.
2. **Set the rules:** paste [`AGENTS.md`](AGENTS.md) into Project settings → Instructions.
3. **Connect GitHub:** Project → GitHub → Connect, under the **jinghihong** account. Lovable creates a new private repo. Send the repo name to Claude Code.
4. **Claude Code pushes the "brain" files** into that repo: `AGENTS.md`, the ranking engine, seed listings, scam rules and a mock API. They sync into Lovable on their own. Check that `src/lib/roomsure/` appears in Lovable's code view before going on.
5. **Prompts 2–8**, one at a time. Check each result in the preview before sending the next.
6. **Hand back:** Claude Code mirrors the Lovable repo into a `lovable-ui` branch of `emergent-hacks`, reviews it, ports it into `platform/`, swaps the mock API for the real one, and deploys.

### The brain files (what Prompts 2–8 rely on)

| File | Provides |
|---|---|
| `src/lib/roomsure/rankListings.ts` | The ranking engine (PR #4) plus the "Prefer verified hosts" switch |
| `src/lib/roomsure/types.ts` | `RoomListing`, `Session`, `IntakeResult`, `CheckResult`, `Reservation` |
| `src/lib/roomsure/deck.ts` | `buildDeck(preferences, listings, destination, swipedIds)` → `{ deck, nearMisses }`, plus `applyFix` |
| `src/lib/roomsure/defaults.ts` | `DEFAULT_PREFERENCES` (Maya), facility labels |
| `src/lib/roomsure/data/listings.ts` | 12–15 Providence demo rooms, including Fox Point (77) |
| `src/lib/roomsure/data/outside-examples.ts` | 3 pasted-listing samples for the scam check |
| `src/lib/roomsure/chat.ts` | The canned host conversation |
| `src/lib/roomsure/api.ts` | Mock API with short fake delays: `demoLogin`, `getListings`, `parseIntake`, `checkListing`, `simulateHostReply`, `reserve`, `resetDemo` |
| `AGENTS.md` | The rules file, at the repo root |

## Rules for prompting

- One prompt at a time. Use Plan mode when Lovable offers it, and answer its questions.
- If Lovable suggests Supabase, Lovable Cloud, auth or a database, say **no**: "UI only, see AGENTS.md."
- To fix something, point at it with the select tool and say what to change *and what to leave alone* ("Only change the score ring. Leave the card layout as it is.").
- If a screen's numbers don't match the demo path in AGENTS.md (Fox Point = 77), tell Lovable to use `buildDeck()` from `src/lib/roomsure/deck.ts` and not to compute scores itself.

---

## Prompt 1: Foundation and Welcome

Run this first, in a new project.

```text
Build the foundation of Roomsure, a mobile-first web app that helps people find a room for 1 to 6 months and check it before they pay. This is a hackathon demo: all data is fake and all verification and payments are simulated. UI only: no backend, database, auth, Supabase, Lovable Cloud or server functions. Plan first and ask me questions if anything is unclear.

DESIGN SYSTEM (warm and trustworthy: a calm, well-kept home and a host you can trust)
- Colors: background #FBF7F1, surface #FFFFFF, ink #1D2B33, muted #66737A, hairline #E8E1D6, primary #0E6B66 (harbor teal) with soft #DDF0EC, warm accent #F4A340 (golden hour) with soft #FDEBD2, good #1F7A4D, caution #B7791F, risk #C2412D, evidence highlight #FFE08A. Put these in the Tailwind theme as named tokens.
- Type: headings in Bricolage Grotesque (600 to 800), everything else in Figtree. Tabular numbers for prices and scores.
- Shape: cards 24px radius, buttons 14px, chips fully rounded. Soft warm shadow 0 10px 30px rgba(29,43,51,0.10).
- Motion: 200 to 350ms ease-out. Respect prefers-reduced-motion. Light mode only.
- Install motion (Framer Motion) and lucide-react.

APP SHELL
- Routes: / (Welcome), /start, /discover, /room/:id, /matches, /matches/:id, /check, /passport.
- Mobile: a bottom tab bar with Discover, Matches, Check and Passport (lucide icons, labels under the icons). Hide it on / and /start.
- Desktop (1024px and up): a slim left nav rail with the same four items and the Roomsure wordmark.
- Header: the Roomsure wordmark on the left and a small "Demo data" pill on the right.
- For now, every page except Welcome shows its title and one sentence about what will go there.

WELCOME PAGE (/), build it fully
- A photo-forward hero: a soft collage of 3 bright, lived-in room photos (no people), with the headline "A room you can trust, for 1 to 6 months" and the subline "Tell us what you need. We rank rooms by your trade-offs, show you why, and let you walk through them before you pay."
- Primary button: "Continue as Maya (demo)", which goes to /start. Secondary button: "Create account" (shows a simple form with name, email and password; on submit it also goes to /start; no real auth).
- Three small trust points under the buttons, each with an icon: "Every score explained", "Walk the room in 3D", "Scam check before you pay".
- A footnote: "Demo · ID and card checks are simulated. We never ask for card numbers or ID documents."
- Must look great at 390px and at 1440px.

Put components in src/components/roomsure/<feature>/, one per file. No lorem ipsum.
```

## Prompt 2: The swipe deck (the hero screen)

Run this after the brain files are in `src/lib/roomsure/`.

```text
Read AGENTS.md first. Build /discover, the swipe deck. This is the most important screen in the app, so make the swipe feel as smooth and satisfying as the best dating apps, while every card explains itself.

DATA
- Get listings with api.getListings() and the ranked deck with buildDeck(preferences, listings, destination, swipedIds) from src/lib/roomsure/deck.ts. Do not compute scores yourself.
- Create src/lib/roomsure/state.ts with the state shape in AGENTS.md. Start with DEFAULT_PREFERENCES and destination "work" from src/lib/roomsure/defaults.ts.

THE CARD STACK
- Show the top card plus 2 behind it (scaled 0.95 and 0.90, offset down 10px and 20px). Render only those 3.
- Drag with mouse or touch. The card follows the pointer and rotates up to 12 degrees with the horizontal drag. Dragging right fades in an "INTERESTED" stamp in primary teal; dragging left fades in a "PASS" stamp in muted slate.
- Release past 30% of the card width, or with a fast flick: the card flies off with momentum. Otherwise it springs back. Use motion (Framer Motion) springs.
- The cards behind animate forward smoothly when the top card leaves.

CARD FRONT
- Photo area (about 60% of the card): photo dots at the top; tapping the left or right edge cycles photos. A "3D tour" chip top-left if listing.scanUrl exists. A ScoreRing top-right: a circular progress ring showing the score (77) with a small "#1" rank under it. A gradient at the bottom of the photo with the title, neighborhood, "$950/mo", "25 min to work" and the dates.
- Below the photo: the card's sentence, e.g. "#1 because it covers every date and is furnished; you give up $50 on price and 5 extra minutes of commute."
- Chips: gains in good green, gives-up in caution amber, plus the trust badge ("Verified host · simulated", or the caution reason in amber) and the fair-price label.
- Tapping the card body (or pressing ↑) flips it in 3D to the back.

CARD BACK: "Show the math"
- One row per factor: name, weight %, a bar for the factor score (0 to 100), and the points it adds. Then the trust multiplier row, then the total. This must match the score on the front exactly.
- A "See full details" button opens /room/:id.

CONTROLS
- Under the stack: round buttons for Undo (rotate-ccw), Pass (x), Details (info) and Interested (heart). Interested is the biggest, in primary teal.
- Keyboard: ← pass, → interested, ↑ flip, Z undo.
- Above the stack: "Card 1 of 4 · ranked for you" and an "Adjust" button that opens the preferences sheet (mobile) or focuses the right panel (desktop).
- A List/Cards toggle. List view shows the same ranked rooms in the same order, each as a compact row with score, title, price, sentence and Interested/Pass buttons.

AFTER A SWIPE
- Interested: save it in state.swipes and show a small toast, "Saved · the host is reviewing". If api.simulateHostReply(id) resolves "accepted", show the MatchOverlay. For now, build a simple placeholder overlay; Prompt 5 makes it beautiful.
- Pass: save it and show nothing.
- Undo brings the last card back with the reverse animation.

RE-RANKING
- When preferences change, re-run buildDeck and animate cards to their new order (layout animation). Show a toast naming the new #1, e.g. "Re-ranked · Bright studio near Downcity is now #1".

OUT OF CARDS
- "You've seen every room that fits" plus the near misses from buildDeck: each shows the room, the reason ("$1,100 is $50 over your $1,050 limit") and a fix button with the fixLabel. Clicking a fix calls applyFix, updates preferences, and the room animates back into the deck.

DESKTOP
- 1024px and up: the deck stays about 400px wide in the center. The right side shows a placeholder "Your preferences" panel (Prompt 3 builds it).

Respect prefers-reduced-motion: crossfade instead of fly-outs. Only change /discover and files you create for it.
```

## Prompt 3: Describe needs and preferences

```text
Read AGENTS.md. Build /start and the preferences controls.

/start, step 1: "What do you need?"
- A large, friendly text box with the placeholder "e.g. I'm interning downtown June 1 to August 15…".
- Three example chips under it. The first one fills in exactly: "I'm interning downtown June 1 to August 15. Budget around $900, $1,050 max. Commute ideally 20 minutes, 35 at most. I need a kitchen, furnished matters a lot, and I can live with up to 5 days' gap."
- "Find my rooms" calls api.parseIntake(text). While waiting, show a warm loading state ("Reading your needs…") with a skeleton of the preferences.
- Show which path ran, using the response's source field: a teal chip "Read by Claude", or a muted chip "Read by rules (offline)".
- If the response has questions, show them as friendly follow-up cards with inputs.

/start, step 2: "Here's what we heard"
- An editable preferences form, filled from the response. Every control has a clear label and shows its value.
  - Destination: a segmented control, "Work, downtown" or "Brown campus".
  - Price: a dual-thumb slider with "ideal" and "walk-away limit" ($500 to $2,000, step $25).
  - Commute: a dual-thumb slider (5 to 60 min).
  - Dates: start and end pickers, plus "Days without a room I can handle" (stepper, 0 to 14).
  - Facilities: chips for Furnished, Kitchen, In-unit laundry, Gym, Private bathroom, Air conditioning and Parking. Tapping cycles Don't care → Nice → Important → Must, each state with its own look (Must has a lock icon).
  - "What matters most": four 0 to 10 sliders (Price, Commute, Dates, Facilities) with a live "weight %" next to each.
  - A "Prefer verified hosts" switch (on by default) with the helper text "Rooms from unverified hosts score 15% lower. You can turn this off."
- "Show my rooms" goes to /discover.

REUSE
- Build the form as one PreferencesPanel component, used in three places: /start step 2, a bottom sheet on /discover (mobile, from "Adjust"), and the right-hand panel on /discover (desktop). On /discover every change updates state immediately, so the deck re-ranks live.

Only change /start, the PreferencesPanel and its wiring on /discover.
```

## Prompt 4: Room detail and the 3D tour

```text
Read AGENTS.md. Build /room/:id.

- Top: a swipeable photo gallery with dots, a back button, and a "3D tour" chip if listing.scanUrl exists.
- Title, neighborhood, a big "$950/mo", and key facts as icon rows: commute minutes to the chosen destination, available dates, room type, and the facilities the room has.
- "Why it's #1": the card sentence, plus gains and gives-up chips.
- "Show the math": the same factor breakdown as the card back, reusing the same component.
- "How well it fits your dates": a horizontal timeline comparing Maya's stay with the room's availability. Any uncovered days are highlighted in caution amber, with a label like "3 days not covered".
- "Fair price": a range bar showing the demo fair range, with a marker for this room's price and the label from the data ("Fair price · demo estimate").
- "Your host": a host card with the host's name, avatar initials, and verification badges marked Simulated (email, ID, card). A caution reason, if any, goes in an amber note ("Landlord consent pending").
- "Walk the room in 3D": a large button. It opens a full-screen overlay with a close button (Esc also closes it). Inside, render an iframe pointing at listing.scanUrl. If there is no scanUrl or the iframe fails, show a friendly placeholder: "3D tour loads here". The overlay footer says "Sample 3D scan · demo. A scan helps you inspect the room; it doesn't prove the listing is genuine."
- A sticky bottom bar with Pass and "I'm interested". These do the same as swiping and return to /discover.

Only change /room/:id and the components it uses.
```

## Prompt 5: Match moment, matches, chat and reserve

```text
Read AGENTS.md. Make the match flow the most delightful moment in the app.

MATCH OVERLAY (replace the placeholder from Prompt 2)
- Full screen, with a warm golden-hour gradient. Maya's avatar and the host's avatar slide in from each side and overlap, with the room's photo behind them. Headline "It's a match!", subline "The host of Sunny room in Fox Point would love to have you."
- A short, tasteful confetti burst in teal and gold. Skip it with reduced motion.
- Buttons: "Message host" (goes to /matches/:id) and "Keep swiping".

/matches
- Tabs: Matches (host accepted), Waiting (liked, host reviewing, with a gentle "reviewing…" shimmer) and Passed (with a "Bring back" button).
- Each row: room photo, title, price, score and status chip.

/matches/:id: chat
- A header with the host's avatar, the room title and a "Matched" chip, and a banner: "Chat demo · no real messages".
- Use the canned conversation from src/lib/roomsure/chat.ts. Messages appear one at a time with a typing indicator. Maya can tap quick replies ("Is June 1 move-in OK?", "Can I reserve the first month?"); each triggers the next canned host message.
- A sticky reservation card: "First month · $950" with a "Reserve first month" button.
- Reserve opens a bottom sheet with a summary (room, dates, first month amount from the listing) and a "Simulated payment" label. "Confirm reservation" calls api.reserve(id), shows a short success animation, then a receipt card (reservation id, amount, date) that also appears in the Passport.
- If the seeker is not verified, show "Verify your Passport to reserve" with a link to /passport instead of the button.

Only change the overlay, /matches, /matches/:id and their components.
```

## Prompt 6: Scam check

```text
Read AGENTS.md. Build /check.

- Title "Found a room somewhere else? Check it first." and a large paste box.
- Three sample chips that fill the box with the texts in src/lib/roomsure/data/outside-examples.ts: "Too good to be true", "Sublet, some caution" and "Looks normal".
- "Check this listing" calls api.checkListing(text). While waiting, show a scanning animation over the text.

RESULT
- A verdict banner at the top: High risk (risk red), Caution (amber) or No issues found (green, with the note "No issues found doesn't mean verified."). The banner always includes "Outside · not verified by Roomsure".
- The pasted text with every evidence quote highlighted in #FFE08A. Tapping or hovering a highlight shows its signal name and severity. Highlight only the exact quotes from the response.
- A signal list: icon, plain-English name ("Asks for a wire deposit before viewing"), severity chip (High, Medium, Low) and the quoted words.
- "What the listing says": a facts table (price, neighborhood, dates, room type, furnished). Show "Not stated" in muted text for anything missing.
- A fair-price comparison bar when the API returns one; otherwise "Estimate unavailable".
- A source chip: "Read by Claude · quotes checked by code" or "Read by rules (offline)".

Only change /check and its components.
```

## Prompt 7: Passport

```text
Read AGENTS.md. Build /passport.

- A "Roomsure Passport" card designed like a premium ID card, with a subtle teal pattern: Maya's avatar initials, name, "Seeker", member since, and three verification rows (Email, ID and selfie, Card), each with a status and a "Simulated" label.
- If a check isn't done, a "Run simulated check" button plays a short scanning animation and marks it verified. Never show fields for document numbers, card numbers or photos.
- "Reservations": receipt cards from state.reservations, or the empty state "No reservations yet. Find a room you love first."
- "Reset demo": a muted button that asks for confirmation inside the page, then clears swipes, matches and reservations, calls api.resetDemo(), and returns to /discover.
- The footnote: "We never ask for card numbers or ID documents in this demo."

Only change /passport and its components.
```

## Prompt 8: Polish pass

```text
Read AGENTS.md. Polish the whole app without changing features.

1. Walk the demo path in AGENTS.md end to end at 390px and at 1440px. Fix anything broken, misaligned, clipped or slow.
2. Make spacing, radii, shadows, chip styles and button sizes consistent across all screens.
3. Every screen needs loading, empty and error states that keep the demo moving.
4. Keyboard: every action is reachable, focus rings are visible, Esc closes overlays and sheets.
5. prefers-reduced-motion: no fly-outs, flips or confetti; use crossfades.
6. Check that every honesty label from AGENTS.md appears where it should.
7. Page transitions: a subtle fade/slide between routes, under 250ms.
8. List anything you couldn't finish.

Do not add features, libraries or a backend.
```

---

## After Lovable

Claude Code then:
1. Mirrors the Lovable repo into the `lovable-ui` branch of `emergent-hacks`, so the team's design work lives in the main repo.
2. Reviews it against AGENTS.md and the demo path.
3. Ports the screens into `platform/` (adds Tailwind there), replaces `src/lib/roomsure/api.ts` mocks with calls to the real routes (`demo/login`, `intake`, `check`, `payment/start`, `demo/reset`), and points the 3D overlay at `/roomwalk/`.
4. Deploys one app on Vercel.

Lovable stays the design sandbox. To change a screen after the port, prompt Lovable, then tell Claude Code which component changed so it can bring the change over.
