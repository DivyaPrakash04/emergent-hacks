# Roomsure ranking engine

This decides the order of a seeker's swipe deck and what each card says. Every room gets a score out of 100 based on the seeker's own trade-offs. The best match is the first card. Each card explains, in plain English, what the seeker gains and gives up, so they can swipe on the reasoning.

It's plain arithmetic, with no AI in the scoring, so every score can be checked by hand. This follows the MVP doc's rule: "AI understands, math decides, AI explains."

| File | What it is |
|---|---|
| `rankListings.ts` | The engine. Pure TypeScript with no dependencies. Import it into the app. |
| `rankListings.test.ts` | Tests, including the MVP doc's must-pass Maya case (77 / 73 / 54). |
| `demo.html` | A working swipe demo. Open it in any browser; no install needed. |
| `build-demo.mjs` | Copies the engine into `demo.html`. Run it after editing the engine. |

## How a room gets its score

The seeker sets an **ideal** and a **walk-away limit** for price, commute and dates. For each facility they pick Don't care, Nice, Important or Must. Then they rate how much each factor matters on a 0–10 slider.

1. **Filter out deal-breakers.** A room never enters the deck if it's past a walk-away limit or missing a "Must" facility. These rooms are kept as **near misses**, each with the one change that would bring it back (for example, "Raise your price limit to $1,100").
2. **Score each factor from 0 to 100.** At or better than ideal = 100. Exactly at the limit = 0. In between, the score drops in a straight line: `100 × (limit − value) ÷ (limit − ideal)`.
   - **Dates:** the value is the number of days of the stay that the room doesn't cover. The ideal is 0 and the limit is the seeker's gap tolerance.
   - **Facilities:** Nice = 1 point and Important = 2. The score is the share of those points the room has. If nothing is marked Nice or Important, facilities sit out.
3. **Turn importance into weights.** Each slider is divided by the total of all sliders, so the weights add up to 100%. If every slider is at 0, all factors count equally.
4. **Add up and deal the deck.** Score = Σ (weight × factor score), rounded. The highest score is the first card. A tie goes to the cheaper room, then the shorter commute.

## Worked example: Maya, summer intern

Maya wants:
- **Price:** $900 ideal, $1,050 limit
- **Commute:** 20 min ideal, 35 min limit
- **Dates:** June 1 to August 15, with up to 5 uncovered days
- **Facilities:** kitchen is a Must, furnished is Important
- **Importance:** price 8, commute 6, dates 4, facilities 2, which become weights of 40%, 30%, 20%, 10%

| Room | Price | Commute | Dates | Furnished | Score |
|---|---|---|---|---|---|
| A: $950, 25 min, all dates, furnished | 66.7 | 66.7 | 100 | 100 | **77** |
| D: $1,000, 12 min, all dates, furnished | 33.3 | 100 | 100 | 100 | **73** |
| B: $880, 32 min, opens 3 days late, unfurnished | 100 | 20 | 40 | 0 | **54** |

Room C ($1,100) is a near miss because it's $50 over her limit. Room A's math: 0.4 × 66.7 + 0.3 × 66.7 + 0.2 × 100 + 0.1 × 100 = 76.7, which rounds to 77.

Maya's first card says:

> #1 because it covers every date and is furnished; you give up $50 on price and 5 extra minutes of commute.

If she raises commute importance from 6 to 9, Room D becomes her first card (77, with A at 75).

## Using it in the app

```ts
import { buildSwipeDeck, applyFix, type Listing, type Preferences } from "./rankListings";

const prefs: Preferences = {
  price: { ideal: 900, limit: 1050 },
  commute: { ideal: 20, limit: 35 },
  dates: { start: "2027-06-01", end: "2027-08-15", maxUncoveredDays: 5 },
  facilities: { kitchen: "must", furnished: "important", gym: "nice" },
  importance: { price: 8, commute: 6, dates: 4, facilities: 2 },
};

// listings: your Listing objects, with commuteMinutes filled in for this seeker's destination
const { deck, nearMisses } = buildSwipeDeck(prefs, listings, alreadySwipedIds);

deck[0].score;     // 77, the number on the card
deck[0].sentence;  // "#1 because it ...; you give up ..."
deck[0].gains;     // [{ label: "Covers every date", phrase: "covers every date", factor: "dates" }, ...]
deck[0].gives;     // chips for the "Gives up" row
deck[0].points;    // per-factor points for a score breakdown bar

// "Out of cards" screen: show nearMisses[i].reasons[j].message, plus a button that runs
const loosened = applyFix(prefs, nearMisses[0].reasons[0].fix);
```

- **Commute:** each listing needs `commuteMinutes` for this seeker's destination. `estimateCommuteMinutes(listingLatLng, destinationLatLng)` implements the MVP doc's straight-line estimate. A routing API is more accurate.
- **Swipes:** pass the IDs of rooms already swiped. Ranks stay fixed, so the second card still says "#2". Re-run `buildSwipeDeck` whenever a slider moves. It's simple arithmetic, so it's fast enough to run on every change.
- **AI explainer (MVP doc 6.3):** send `gains.map(g => g.phrase)` and `gives.map(g => g.phrase)` to get a smoother sentence. Keep `sentence` as the fallback.
- **Drag-to-rank instead of sliders:** leave out `importance` and pass `priorityOrder: ["price", "commute", "dates", "facilities"]`. That gives the doc's 40 / 30 / 20 / 10% weights.

## How this differs from MVP doc section 4

| MVP doc | This engine | Why |
|---|---|---|
| Weights from drag-to-rank order | 0–10 importance sliders (drag-to-rank still supported via `priorityOrder`) | Two factors can matter equally |
| "Space" = furnished and private bath, averaged | Seven facilities, each Don't care / Nice / Important / Must | Covers kitchen, gym, laundry and the rest |
| "houseFit" factor (lifestyle vs. house rules) | Not included yet | Needs seeker lifestyle data first |
| Score × trust factor (caution 0.85, outside 0.7) | Trust is not part of the score | Swipe cards rank on the seeker's own preferences; trust shows as a badge. Suspended listings should be removed before they reach the engine. |
| List view and swipe view | Swipe deck, plus near misses when the deck runs out | Matches the swipe product |

## Running the tests and the demo

```bash
node --test ranking/rankListings.test.ts
```

This needs Node 22.18 or newer, which runs TypeScript directly. To see the demo, double-click `ranking/demo.html`. After editing `rankListings.ts`, run `node ranking/build-demo.mjs` so the demo picks up the change. A test fails if you forget.

## Known gaps

- The demo's seven listings and commute times are made up.
- There's only one commute destination at a time.
- Swipes don't change the weights yet. The MVP doc lists "learned weights from swipe history" as a later feature.
