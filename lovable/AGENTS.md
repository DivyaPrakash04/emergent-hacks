# Roomsure: rules for building this UI

Roomsure helps people find a room for 1 to 6 months and check it before they pay. This project is the **front end** of a hackathon demo. Judges score functionality, usability, technical execution and originality. The live demo is 2 minutes, presented on a laptop and sometimes a phone.

Demo persona: **Maya Chen**, a summer intern in Providence (June 1 to August 15), working downtown.

## Golden rules

1. **UI only.** Do not add a database, auth, Supabase, Lovable Cloud, server functions, edge functions or connectors. Our own backend replaces the mock later.
2. **All data goes through `src/lib/roomsure/api.ts`.** Never fetch or invent data inside a component. Never call an AI model from this app.
3. **Never edit files in `src/lib/roomsure/` that start with `// DO NOT EDIT`.** They hold the real ranking engine, seed data and scam rules. Import from them.
4. **Scores come only from `buildDeck()`** in `src/lib/roomsure/deck.ts`. Never compute, round differently, or hardcode a score, a price or a scam verdict in UI code.
5. **No real ID, selfie or card fields, ever.** Verification and payments are simulated, and the UI says so.
6. **Label demo things honestly**, with these exact phrases:
   - "Demo data" (small pill in the app header)
   - "Simulated" next to ID checks, card checks, host replies and payments
   - "Chat demo · no real messages" in chat
   - "Sample 3D scan · demo" on 3D tours
   - "Outside · not verified by Roomsure" on every scam-check result
   - "Read by Claude" or "Read by rules (offline)": show the `source` field the API returns, never guess
7. Never say a room or listing is "safe" or "guaranteed". A clean scam check says "No issues found". Call the 3D tour "3D tour" or "Walk the room in 3D", never "360".
8. No protected traits (race, religion, gender, disability, nationality, family status) anywhere in forms, filters or copy.

## Stack and structure

- Use the project's existing React, TypeScript, Tailwind and shadcn/ui setup. Add `motion` (Framer Motion) for drag and spring animation, and `lucide-react` for icons. No other large libraries.
- Components go in `src/components/roomsure/<feature>/`, one component per file, named by what they show (`SwipeCard.tsx`, `ScoreRing.tsx`, `MatchOverlay.tsx`). Keep route files thin: they compose components.
- App state lives in `src/lib/roomsure/state.ts` (you create this one), persisted to localStorage under the key `roomsure-demo-v1`. If stored data is missing or broken, reset to defaults without crashing. State shape:
  - `session`: `{ userId, name, verified }` or `null`
  - `preferences` (type `Preferences` from `rankListings.ts`) and `destination` (`"work"` or `"campus"`)
  - `intakeSource`: `"claude" | "rules" | null`
  - `swipes`: listing id → `"interested" | "pass"`, plus `swipeHistory` (ids in order, for undo)
  - `hostReplies`: listing id → `"reviewing" | "accepted"`
  - `reservations`: listing id → the receipt from `api.reserve()`
- Key everything by **listing id**, never by array position. Ranking order changes when preferences change.

## Routes

| Path | Screen |
|---|---|
| `/` | Welcome: "Continue as Maya (demo)" and "Create account" |
| `/start` | Describe your needs, then review preferences |
| `/discover` | The swipe deck (the hero screen), with a list-view toggle |
| `/room/:id` | Room detail: photos, why it ranked, the math, trust, fair price, 3D tour |
| `/matches` | Likes and matches: tabs Matches, Waiting, Passed |
| `/matches/:id` | Chat with the host, then Reserve |
| `/check` | Scam check for a listing found elsewhere |
| `/passport` | Maya's Roomsure Passport: simulated checks, reservations, Reset demo |

Mobile: a bottom tab bar with Discover, Matches, Check and Passport. Desktop (1024px and up): a slim left nav rail. On `/discover` the deck stays phone-width in the center and a **live preferences panel** sits on the right, so moving a slider visibly re-ranks the deck.

## Design system: warm and trustworthy

The feeling: a calm, well-kept home and a host you can trust. Photo-first, soft shapes, generous space. Never cluttered, never neon.

- **Colors**
  - background `#FBF7F1` (warm porch white), surface `#FFFFFF`
  - ink `#1D2B33`, muted text `#66737A`, hairline `#E8E1D6`
  - primary `#0E6B66` (harbor teal: trust, main buttons, "Interested"), primary-soft `#DDF0EC`
  - warm accent `#F4A340` (golden hour: match moment, highlights, the score ring's glow), accent-soft `#FDEBD2`
  - good `#1F7A4D`, caution `#B7791F`, risk `#C2412D`, evidence highlight `#FFE08A`
- **Type:** headings in Bricolage Grotesque (600 to 800); everything else in Figtree (400 to 700). Use tabular numbers for prices and scores. Body text 16px on mobile; never below 13px.
- **Shape:** cards with a 24px radius, buttons 14px, chips fully rounded. Soft warm shadow `0 10px 30px rgba(29,43,51,0.10)`. Hairlines over heavy borders.
- **Motion:** 200 to 350ms ease-out for UI. Springs for swipe (around stiffness 300, damping 30). Respect `prefers-reduced-motion`: crossfade instead of fly-outs, no confetti.
- **Imagery:** real-looking interior photos of bright, lived-in rooms. Each listing has up to 3 photos, referenced by the `photos` field. Never show people's faces in room photos.
- Light mode only for the demo.

## Copy

Plain, warm, specific. Second person ("You give up $50 on price"). Short sentences. Buttons say exactly what happens ("Reserve first month", "Raise price limit to $1,100"). Errors say what went wrong and what to do. Use real demo content from the data files. No lorem ipsum, no made-up statistics, no real company names. Save exclamation marks for the match moment.

## Accessibility and quality

- Every gesture has a button: Pass, Interested, Undo and Details. The deck also works with the keyboard: ← pass, → interested, ↑ details, Z undo.
- Visible focus rings, labeled form controls, 44px minimum touch targets, color contrast of at least 4.5:1 for text.
- Test at 390px (phone) and 1440px (laptop). No horizontal scrolling.
- Every screen has loading, empty and error states that keep the demo moving.
- Only the top 3 deck cards render, to keep swiping smooth.

## The demo path (keep this working at all times)

Continue as Maya → paste the needs sentence → review preferences → swipe: card #1 is "Sunny room in Fox Point", score 77 → open the math → raise commute importance and watch room D move to #1 → turn off "Prefer verified hosts" and watch the cheaper sublet jump to #1, then back → swipe Interested on Fox Point → "It's a match" → chat → Reserve first month ($950, simulated) → Scam check with the high-risk sample → High risk with the quoted red flags highlighted.
