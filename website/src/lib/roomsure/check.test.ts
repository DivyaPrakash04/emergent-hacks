import { describe, expect, it } from "vitest";
import { checkListingRules } from "./check";
import { OUTSIDE_EXAMPLES } from "./data/outside-examples";

const ex = (id: string) => OUTSIDE_EXAMPLES.find((e) => e.id === id)!.text;

describe("rules scam check", () => {
  it("too-good sample is high risk", () => expect(checkListingRules(ex("too-good")).verdict).toBe("high"));
  it("sublet sample is caution", () => expect(checkListingRules(ex("sublet-caution")).verdict).toBe("caution"));
  it("normal sample has no issues", () => expect(checkListingRules(ex("looks-normal")).verdict).toBe("clear"));
  it("every quote is an exact substring", () => {
    for (const e of OUTSIDE_EXAMPLES) for (const s of checkListingRules(e.text).signals) for (const q of s.quotes) expect(e.text.includes(q)).toBe(true);
  });
});
