# Roomsure Master Build Prompt

Copy this prompt into a coding LLM after opening the Roomsure project repository. The detailed requirements file is the source of truth for implementation specifics.

---

You are implementing **Roomsure**, a hackathon web demo for finding and assessing short-term rooms (one to six months). Work in the existing repository. First inspect its files, conventions, and current git changes. Do not overwrite or discard existing user work. The repository may initially contain only documents and a standalone HTML prototype.

## Read these references first

1. `README.md` for the product goal and team context.
2. `Roomsure MVP Requirements (for LLM build).md` for authoritative product scope and functional behavior.
3. `ARCHITECTURE.md` for technical boundaries, data persistence decisions, contracts, and diagrams.
4. `Roomsure Prototype.html` for visual direction and existing interaction ideas.
5. `Roomsure Pitch Deck.pptx` only if pitch context is needed.

If this prompt conflicts with the detailed requirements, follow the detailed requirements for product behavior and `ARCHITECTURE.md` for technical implementation. If the user gives a newer explicit direction, follow it and update the docs where appropriate.

## Product outcome

Deliver one coherent, responsive demo journey:

**describe needs → review preferences → see explainable ranked rooms → swipe the same rooms → shortlist and view a room/video → mock mutual match/chat**, plus a separate **paste outside listing → scam verdict with quoted evidence** flow.

The app should remain usable if all AI providers are unavailable. Build the smallest reliable version that demonstrates the product clearly.

## Technology and architecture

- Prefer one Next.js App Router app with React, TypeScript, and Tailwind CSS unless the repository already has a working equivalent stack.
- Use local JSON for synthetic seed listings; use lightweight client state/local storage for demo preferences, likes, and mock host decisions.
- Implement ranking and scam rules as deterministic TypeScript modules. The LLM must not determine listing scores.
- If AI is configured, call it server-side, validate its output with a schema, and keep keys out of browser bundles.
- Provide deterministic fallbacks. Never make core navigation depend on an LLM, external inventory, payment, or identity provider.
- Associate supplied videos/posters with stable listing IDs. Provide loading/error/fallback UI. Only call an asset 360° if it is true 360° media and a compatible viewer is implemented.
- Avoid unnecessary dependencies and services. Do not introduce a real database, auth, payment, or ID-verification integration for this hackathon demo.

## Non-negotiable product constraints

- No real ID, driver's license, credit-card, payment, or deposit information may be requested or stored.
- Verification, match/chat, host actions, and listing data must be honestly labeled demo/simulated as applicable.
- Never scrape third-party sites. Outside listings are analyzed only from user-pasted text.
- Do not collect, infer, store, or rank by protected traits (including race, religion, gender, disability, national origin, and family status).
- A listing marked outside is always labeled **Outside · not verified by Roomsure**.
- “No issues found” is not the same as safe or verified. Never promise that a score, video, or badge guarantees safety.
- Suspended listings are excluded from results.

## Implementation priorities

### P0: Build first

1. Shared TypeScript data types and synthetic seed listings.
2. Pure `rankListings` function matching the detailed spec, including hard filters, trust factors, weighted satisfaction, stable sort, score breakdown, and reasons.
3. Preferences UI with editable ideal/limit controls and reorderable priorities; rerank locally on every change.
4. Result cards with score, explanation, fair-price note, trust status/reason, and approximate commute.
5. Swipe deck consuming the same ranked results; visible pass/like controls; shortlist of likes.
6. Room detail with matching stable-ID video and fallback behavior.
7. Outside-listing checker with exact quoted evidence and risk verdict.
8. Clearly mocked verification and mutual-match/chat states.
9. Responsive, accessible visual polish and a stable two-minute demo flow.

### P1: Only after P0 works end to end

- AI intake parser and optional local/cloud provider adapter.
- Host paste-to-listing extraction/review/publish.
- Additional seed records or optional enhancements explicitly marked in the spec.

## Critical scoring fixture

Use the formula, not hardcoded outcomes. For the four-dimension fixture in the requirements, Room A calculates to **77** and Room D calculates to **73**. Room B calculates to **54**. The original fixture is consistent with its formula; preserve these expected values.

## Working method

1. Inspect the repository and report the existing stack and any constraints before making broad changes.
2. Create or adapt the app scaffold with the smallest sensible structure.
3. Define shared `Listing`, `Preferences`, and `RankedRoom` types before parallel screen work.
4. Implement the ranking module and a small data fixture first; ensure displayed scores are reproducible.
5. Build the end-to-end P0 journey, keeping list/swipe/detail/shortlist connected to one ranked result source.
6. Add AI or host flow only after fallbacks and the main demo path work.
7. Keep changes scoped. Do not rewrite unrelated files or delete reference artifacts.
8. If the user requests verification, run the relevant checks and report exactly what ran. Do not claim checks were run if they were not.
9. Summarize changed files, key behavior, limitations, and the next useful task.

## Acceptance before calling the MVP ready

Use the full acceptance list in `Roomsure MVP Requirements (for LLM build).md`. At minimum confirm that:

- Preferences and priority changes immediately rerank without reload.
- List and swipe use identical ordering and score values.
- The score fixture follows the stated formula.
- Likes appear in shortlist and open the correct detail/video.
- A suspicious pasted listing yields a high-risk verdict with actual quoted evidence.
- AI outage does not block the main demo.
- No real identity/payment data is collected and demo claims are explicit.

Do not add unrelated features. Optimize for a clear, reliable demonstration, not production-marketplace completeness.




