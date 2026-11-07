import { describe, expect, it } from "vitest";
import { buildDeck } from "./deck";
import { DEFAULT_PREFERENCES as P } from "./defaults";
import { LISTINGS } from "./data/listings";

describe("demo deck", () => {
  it("ranks Sunny room in Fox Point #1 with score 77", () => {
    const top = buildDeck(P, LISTINGS, "work").deck[0]!;
    expect(top.listing.title).toBe("Sunny room in Fox Point");
    expect(top.score).toBe(77);
  });

  it("the math rows add up to the shown score", () => {
    const top = buildDeck(P, LISTINGS, "work").deck[0]!;
    const sum = Object.values(top.points).reduce((a, b) => a + b, 0) * top.trustMultiplier;
    expect(Math.round(sum)).toBe(top.score);
  });

  it("raising commute importance moves the Downcity studio to #1", () => {
    const d = buildDeck({ ...P, importance: { ...P.importance, commute: 10 } }, LISTINGS, "work");
    expect(d.deck[0]!.listing.id).toBe("downcity-studio");
  });

  it("turning off Prefer verified hosts puts the cheaper sublet #1", () => {
    const d = buildDeck({ ...P, preferVerified: false }, LISTINGS, "work");
    expect(d.deck[0]!.listing.id).toBe("federal-hill-sublet");
  });

  it("swiped rooms leave the deck but keep their ranks", () => {
    const d = buildDeck(P, LISTINGS, "work", ["fox-point"]);
    expect(d.deck[0]!.rank).toBe(2);
    expect(d.total).toBe(4);
  });
});
