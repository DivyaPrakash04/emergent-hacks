# Roomsure Demo Script

Two minutes, one presenter clicking and talking. Each beat lists what to click, what to say, and which judging criterion it proves: **F**unctionality, **U**sability, **T**echnical execution, **O**riginality.

This script matches the live website, https://roomsure-hackathon.vercel.app (the `website/` app on `main`), as checked on Nov 7, 2026. The numbers below come from the website's own ranking code with Maya's preferences.

## Before you present (10 minutes ahead)

- [ ] Open the production link, https://roomsure-hackathon.vercel.app, on the demo laptop. **Not a preview link:** the backend only accepts the production address, so on previews "Find my rooms" and the scam check show an error. Zoom the browser to 125% so judges can read it.
- [ ] Click **Continue as Maya**, then go to **Passport** → **Reset demo** → confirm. This clears swipes, matches and reservations in this browser.
- [ ] Run the intake sentence once. This warms the server and Claude.
- [ ] Open the 3D sample scan in a **second tab**: https://roomsure-hackathon.vercel.app/scans/room3d/index.html. Click into it once so it loads, then press Esc. (The **Walk the room in 3D** button on the room pages shows a placeholder for the demo rooms, so use this tab instead.)
- [ ] If anyone published a test room on **List your room** in this browser, unpublish it there. A published room joins Maya's deck and can take #1.
- [ ] Have the laptop backup ready (`http://localhost:5173`, with the backend running on port 3000; see the README), plus `ranking/demo.html` and the screen recording.
- [ ] Silence notifications. Charge the laptop. Connect to the venue wifi and keep a phone hotspot ready.

## The script

| Time | Click | Say | Proves |
|---|---|---|---|
| 0:00–0:15 | Welcome screen | "Maya is moving to Providence for a 10-week internship. Nightly rentals cost too much, leases run a year, and informal posts are where scams live. Roomsure finds her a room she can trust." | — |
| 0:15–0:35 | **Continue as Maya** → paste the intake sentence (below), or click **Summer intern downtown**, which fills in the same sentence → **Find my rooms** → **Show my rooms** | "One click in as Maya; her ID checks are simulated. She describes what she needs in plain English. Roomsure turns it into preferences she can edit, and the label shows whether Claude or our offline rules read it. If Claude is down, the rules take over." | U, T |
| 0:35–1:00 | Card #1, **Sunny room in Fox Point, 77** → click the card (or press ↑) to **show the math** → click it again to flip back → in **Your preferences**, under **What matters most**, drag **Commute** from 4 to 9 → turn **Prefer verified hosts** off, then on | "Every card says why: number one covers every date and is furnished, and she gives up $50 on price. That's plain math, no AI in the score. Watch: commute matters more, and the Downcity studio jumps to first. Turn off verified hosts, and a cheaper sublet on Federal Hill takes first place. Turn it back on, and it drops 25%, with the reason: the host hasn't finished the ID check." | O, T, F |
| 1:00–1:15 | Switch to the **3D tab** → click into the room → WASD for 5 seconds → Esc → switch back | "She likes the top room, and instead of trusting photos, she can walk through a room. Hosts film a one-minute phone video and our pipeline turns it into a walkable 3D scan. We scanned this kitchen ourselves from a phone video." | O, T |
| 1:15–1:30 | Swipe right on the top card, **Bright studio near Downcity** (or press →) → **It's a match!** appears → **Message host** → **Reserve first month** → **Confirm reservation** → the receipt shows in the chat and under **Reservations** in the Passport | "The host says yes, they match, and chat opens. She reserves the first month. It's simulated today, but it runs on real accounts and is wired for Stripe test mode." | F |
| 1:30–1:50 | **Check** tab → **Too good to be true** → **Check this listing** | "Not every listing comes from Roomsure. Paste one from anywhere. Roomsure quotes the exact red flags: a $900 deposit before a viewing, an owner overseas who can't show the apartment and will mail the keys, pressure to decide within 24 hours, and contact only by email. High risk, and clearly marked not verified by us." | O, F, T |
| 1:50–2:00 | — | "Under the hood: a tested ranking engine, real accounts, Claude with schema checks and an offline fallback, and 3D rooms from a phone video. Roomsure: a room you can trust." | T |

**Intake sentence (paste exactly, or click Summer intern downtown):**

> I'm interning downtown June 1 to August 15. Budget around $900, $1,050 max. Commute ideally 20 minutes, 35 at most. I need a kitchen, furnished matters a lot, and I can live with up to 5 days' gap.

**Expected deck (4 cards):**
1. Sunny room in Fox Point, 77
2. Summer sublet on Federal Hill, 75 (Caution: the host hasn't finished the ID check)
3. Bright studio near Downcity, 69
4. Quiet attic room in Elmhurst, 68

**Near misses** (shown once she runs out of cards):
- Private suite on College Hill: $50 over her price limit
- Garden-level room in Cranston: 13 minutes over her commute limit
- Room by Wayland Square: 19 days of her stay uncovered
- Loft room in the West End: 15 days uncovered

**After the slider moves:**
- **Commute importance at 9:** Downcity studio 78, Federal Hill sublet 75, Fox Point 74, Elmhurst 62. At 8, the Downcity studio is also first; avoid stopping at 7, where the top three tie at 75. While you drag past 7, a toast may briefly say the Federal Hill sublet is #1; keep going to 9, and the next toast says "Bright studio near Downcity is now #1".
- **Prefer verified hosts off:** the Federal Hill sublet scores 100 and goes first. Turned back on, it's multiplied by 0.75 (25% lower).
- **Room prices:** Downcity studio $1,020, Fox Point $950. Both hosts accept in the demo.

**High-risk sample** (the **Too good to be true** button; the text lives in `website/src/lib/roomsure/data/outside-examples.ts`):

> Beautiful furnished 1 bedroom in Downcity, only $450/month, June 1 to August 31. I'm currently overseas for work so I can't show the apartment in person. To hold it, please send a $900 deposit by wire transfer today and I will mail you the keys. Many people are interested, so you need to decide within 24 hours. Contact me only by email, not through the site.

**Expected result: High risk**, labeled "Outside · not verified by Roomsure". The live check quoted:
- `payment_pressure`: "send a $900 deposit"
- `cannot_view`: "can't show the apartment", "mail you the keys"
- `urgency`: "Many people are interested", "you need to decide within 24 hours"
- `off_platform_contact`: "Contact me only by email, not through the site."
- `price_far_below_fair`: "$450/month"

The exact quotes can differ a little between Claude and the offline rules. The verdict is High risk either way.

## If something breaks

| Problem | Do this | Say |
|---|---|---|
| Live link is down or slow | Switch to the laptop backup (`http://localhost:5173`) | "Let me run it locally." |
| "We couldn't read that just now" after **Find my rooms** | Check that you're on https://roomsure-hackathon.vercel.app, not a preview link | Nothing; reload and keep going. |
| Claude is slow | Wait about 8 seconds; the rules result appears | "That's the offline fallback, by design." |
| 3D tab won't load | Skip it and go straight to the swipe | "The scan is a sample; let me show the rest of the flow." |
| Logged out after a restart | Click **Continue as Maya** again | Nothing; keep going. |
| "Already reserved" | **Passport** → **Reset demo** | Nothing. |
| Everything fails | Play the recording | "Here's the full flow we recorded this morning." |

## Likely judge questions

- **"Why does an unverified room rank lower?"** It's Maya's choice. "Prefer verified hosts" is a setting she controls, the card shows the exact penalty and reason, and she can turn it off.
- **"Is that 3D room the real listing?"** No. It's a kitchen we scanned ourselves from a phone video, shown as a sample scan. The scan pipeline (video → camera solve → Gaussian splat) is built in `roomwalk/scan` and runs on a cloud GPU in about 10–20 minutes, so hosts would scan their own rooms.
- **"What does the AI actually do?"** Claude reads Maya's sentence and pasted listings, and suggests evidence. Code computes every score and every verdict, and only shows a quote if it really appears in the text. Without Claude, everything still works. We measured it: on our test set, Claude read [X of Y] needs correctly against [Z] for the offline rules, and invented no evidence. (Fill in from the accuracy check in `platform/evals/`.)
- **"Is the payment or ID check real?"** Simulated in the demo. Accounts and sessions are real, with hashed passwords. The Stripe Identity and Checkout paths are built for test mode but switched off.
- **"How is this different from a listings site?"** Three things: you swipe on the reasoning, not just photos; near misses tell you the one change that brings a room back; and the scam check quotes the evidence instead of giving a vague warning.
- **"What's next?"** Real host onboarding with in-app scanning, duplicate-photo detection for scams, and learning weights from swipe history.
