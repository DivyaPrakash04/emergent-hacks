# Roomsure Demo Script

Two minutes, one presenter clicking and talking. Each beat lists what to click, what to say, and which judging criterion it proves: **F**unctionality, **U**sability, **T**echnical execution, **O**riginality.

## Before you present (10 minutes ahead)

- [ ] Open the production link (not a preview link) on the demo laptop. Zoom the browser to 125% so judges can read it.
- [ ] Click **Continue as Maya**, then **Reset demo**.
- [ ] Run the intake sentence once. This warms the server and Claude.
- [ ] Open "Walk the room in 3D" once, so the sample scan is cached, then close it.
- [ ] Have the laptop backup ready in a second tab (`http://localhost:3000`), plus `ranking/demo.html` and the screen recording.
- [ ] Silence notifications. Charge the laptop. Connect to the venue wifi and keep a phone hotspot ready.

## The script

| Time | Click | Say | Proves |
|---|---|---|---|
| 0:00–0:15 | Welcome screen | "Maya is moving to Providence for a 10-week internship. Nightly rentals cost too much, leases run a year, and informal posts are where scams live. Roomsure finds her a room she can trust." | — |
| 0:15–0:35 | **Continue as Maya** → Rooms → paste the intake sentence (below) → Enter | "One click in, and her Passport shows simulated ID and card checks. She describes what she needs in plain English. Claude turns it into preferences she can edit. The label shows Claude did it, and if Claude is down, rules take over." | U, T |
| 0:35–1:00 | Card #1 → **Show the math** → drag commute importance 6 → 9 → flip **Prefer verified hosts** off, then on | "Every card says why: number one covers every date and is furnished, and she gives up $50 on price. That's plain math, no AI in the score. Watch: commute matters more, and room D jumps to first. Turn off verified hosts, and a cheaper sublet takes first place. Turn it back on, and it drops 15%, with the reason: the landlord hasn't confirmed consent." | O, T, F |
| 1:00–1:15 | Swipe right on room A → **Walk the room in 3D** → W/mouse for 5 seconds → Esc | "She likes it, and instead of trusting photos, she walks through it. Hosts film a one-minute phone video and our pipeline turns it into a walkable 3D scan. We scanned this kitchen ourselves from a phone video." | O, T |
| 1:15–1:30 | **Simulate host reply** → chat appears → **Reserve** → payment shows in the Passport | "The host says yes, they match, and chat unlocks. She reserves the first month. It's simulated today, but it runs on real accounts and is wired for Stripe test mode." | F |
| 1:30–1:50 | **Scam check** tab → High-risk sample → **Check** | "Not every listing comes from Roomsure. Paste one from anywhere. Roomsure quotes the exact red flags: a wire deposit today, an owner abroad who can't show the room, keys by mail. High risk, and clearly marked not verified by us." | O, F, T |
| 1:50–2:00 | — | "Under the hood: a tested ranking engine, real accounts, Claude with schema checks and an offline fallback, and 3D rooms from a phone video. Roomsure: a room you can trust." | T |

**Intake sentence (paste exactly):**

> I'm interning downtown June 1 to August 15. Budget around $900, $1,050 max. Commute ideally 20 minutes, 35 at most. I need a kitchen, furnished matters a lot, and I can live with up to 5 days' gap.

Expected deck (6 cards): Sunny room in Fox Point 77, Bright studio near Downcity 73, Garden sublet on Federal Hill 67, Quiet room on Smith Hill 54, Shared flat in the West End 48, Loft room in the Armory 38. Near misses: Wayland Square suite (price), Olneyville (commute), College Hill attic (no kitchen), Elmhurst (opens June 20), Mount Pleasant sublet (price).

**High-risk sample (seeded in `platform/lib/roomsure/data/outside-examples.ts`):**

> Furnished room near Wickenden St, $550/month, available June 1. I'm working abroad right now so I can't show the room, but I'll mail you the keys. Please wire the $550 deposit today to hold it, many people are interested. Text me at (401) 555-0147.

Expected: High risk. Quotes for `payment_pressure` ("wire the $550 deposit today"), `cannot_view` ("can't show the room"), `urgency` ("many people are interested"), `off_platform_contact` ("Text me at (401) 555-0147"), plus `price_far_below_fair`.

## If something breaks

| Problem | Do this | Say |
|---|---|---|
| Live link is down or slow | Switch to the laptop tab (`localhost:3000`) | "Let me run it locally." |
| Claude is slow | Wait about 8 seconds; the rules result appears | "That's the offline fallback, by design." |
| 3D sample won't load | The viewer shows the built-in demo room | "That's our offline room. A real scan looks photographic." |
| Logged out after a restart | Click **Continue as Maya** again | Nothing; keep going. |
| "Already reserved" | Click **Reset demo** | Nothing. |
| Everything fails | Play the recording | "Here's the full flow we recorded this morning." |

## Likely judge questions

- **"Why does an unverified room rank lower?"** It's Maya's choice. "Prefer verified hosts" is a setting she controls, the card shows the exact penalty and reason, and she can turn it off.
- **"Is that 3D room the real listing?"** No. It's a kitchen we scanned ourselves from a phone video, attached to a demo listing, and the app labels it a sample scan. The scan pipeline (video → camera solve → Gaussian splat) is built in `roomwalk/scan` and runs on a cloud GPU in about 10–20 minutes, so hosts would scan their own rooms.
- **"What does the AI actually do?"** Claude reads Maya's sentence and pasted listings, and suggests evidence. Code computes every score and every verdict, and only shows a quote if it really appears in the text. Without Claude, everything still works. We measured it: on our test set, Claude read [X of Y] needs correctly against [Z] for the offline rules, and invented no evidence. (Fill in from the accuracy check in `platform/evals/`.)
- **"Is the payment or ID check real?"** Simulated in the demo. Accounts and sessions are real, with hashed passwords. The Stripe Identity and Checkout paths are built for test mode but switched off.
- **"How is this different from a listings site?"** Three things: you swipe on the reasoning, not just photos; near misses tell you the one change that brings a room back; and the scam check quotes the evidence instead of giving a vague warning.
- **"What's next?"** Real host onboarding with in-app scanning, duplicate-photo detection for scams, and learning weights from swipe history.
