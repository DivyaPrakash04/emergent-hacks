# Prompt 2: the swipe deck (/discover)

## What I found in the repo
- Only the ranking engine exists (`ranking/rankListings.ts`, branch `feat/ranking-engine`). It ranks by price, commute, dates and facilities and already has `buildSwipeDeck` and `applyFix`.
- These files don't exist anywhere in the repo yet: `deck.ts`, `api.ts`, `defaults.ts`, `types.ts`, the demo listings, the scam samples, the host chat, and the "Prefer verified hosts" switch.

## Approach
1. **Copy the ranking engine as-is** into `src/lib/roomsure/rankListings.ts`, with no changes to its logic.
2. **Build stand-in "brain" files** so the deck runs now. Each one starts with a `// STAND-IN` header so Claude Code can swap it out later:
   - `types.ts`: `RoomListing` (photos, neighborhood, host, trust, fair price, `scanUrl`), plus `Session`, `Reservation` and the other types listed in lovable-prompts.md.
   - `defaults.ts`: `DEFAULT_PREFERENCES` for Maya (June 1 to Aug 15, $1,050 limit, downtown work).
   - `data/listings.ts`: about 12 Providence rooms, adjusted so "Sunny room in Fox Point" scores exactly 77 at #1, plus room D and a cheaper unverified sublet for the later demo steps.
   - `deck.ts`: `buildDeck(prefs, listings, destination, swipedIds)` returns `{ deck, nearMisses }`. It wraps the engine, adds a trust multiplier ("Prefer verified hosts") and passes `applyFix` through.
   - `api.ts`: a mock API with short fake delays. For now it has `getListings` and `simulateHostReply`, with stubs for the rest.
3. **Add `state.ts`**: the state shape from AGENTS.md, saved under `roomsure-demo-v1`, which resets to defaults if the saved data is broken.
4. **Generate 3 to 4 room photos**, reused across the listings.
5. **Build the deck UI** in `src/components/roomsure/discover/`:
   - `SwipeDeck`: shows only the top 3 cards, with drag, rotate, the stamps, fly-off when you let go past the edge, spring-back otherwise, and undo.
   - `SwipeCard`, `CardFront`, `CardBack`: a 3D flip to "Show the math", where the rows add up exactly to the score.
   - `ScoreRing`, `PhotoCarousel`, `ReasonChips`.
   - `DeckControls` with the buttons and keyboard shortcuts, `DeckHeader` with the "Card 1 of N" count, the Adjust button and the List/Cards toggle, and `DeckListView`.
   - `OutOfCards` with the near-miss fix buttons, a placeholder `MatchOverlay`, a toast when the order changes, and a placeholder preferences panel on desktop.
   - When motion is reduced, cards crossfade instead of flying off.
6. **Add a small test** that Fox Point is #1 at 77 and that its "Show the math" rows add up to 77.

## Open point
If Claude Code already has its own versions of these files, the stand-ins could disagree with them. Approving this plan means the stand-ins get replaced later.
