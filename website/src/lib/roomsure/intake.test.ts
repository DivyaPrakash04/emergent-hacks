import { describe, expect, it } from "vitest";
import { parseIntakeRules } from "./intake";

const EX = "I'm interning downtown June 1 to August 15. Budget around $900, $1,050 max. Commute ideally 20 minutes, 35 at most. I need a kitchen, furnished matters a lot, and I can live with up to 5 days' gap.";

describe("rules intake", () => {
  const r = parseIntakeRules(EX);
  it("reads dates", () => expect(r.preferences.dates).toMatchObject({ start: "2027-06-01", end: "2027-08-15", maxUncoveredDays: 5 }));
  it("reads price", () => expect(r.preferences.price).toEqual({ ideal: 900, limit: 1050 }));
  it("reads commute", () => expect(r.preferences.commute).toEqual({ ideal: 20, limit: 35 }));
  it("reads facilities", () => expect(r.preferences.facilities).toEqual({ kitchen: "must", furnished: "important" }));
  it("downtown means work, no questions", () => {
    expect(r.destination).toBe("work");
    expect(r.questions).toHaveLength(0);
  });
});

import { buildDeck } from "./deck";
import { LISTINGS } from "./data/listings";

describe("demo path after reading Maya's sentence", () => {
  const p = parseIntakeRules(EX).preferences;
  it("Fox Point is #1 at 77", () => {
    const top = buildDeck(p, LISTINGS, "work").deck[0]!;
    expect([top.listing.id, top.score]).toEqual(["fox-point", 77]);
  });
  it("commute importance 10 puts the Downcity studio first", () => {
    expect(buildDeck({ ...p, importance: { ...p.importance, commute: 10 } }, LISTINGS, "work").deck[0]!.listing.id).toBe("downcity-studio");
  });
  it("turning off Prefer verified hosts puts the sublet first", () => {
    expect(buildDeck({ ...p, preferVerified: false }, LISTINGS, "work").deck[0]!.listing.id).toBe("federal-hill-sublet");
  });
});
