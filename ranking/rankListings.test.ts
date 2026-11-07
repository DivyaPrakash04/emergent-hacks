// Run with Node 22.18+ or 24:   node --test ranking/rankListings.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  applyFix,
  buildSwipeDeck,
  estimateCommuteMinutes,
  rankListings,
  weightsFor,
  type Listing,
  type Preferences,
} from "../platform/lib/roomsure/rankListings.ts";
import { dataForDemo, dataInDemo, engineForDemo, engineInDemo } from "./build-demo.mjs";

const rooms: Listing[] = [
  { id: "A", pricePerMonth: 950, commuteMinutes: 25, availableFrom: "2027-06-01", availableTo: "2027-08-20", facilities: ["furnished", "kitchen"] },
  { id: "B", pricePerMonth: 880, commuteMinutes: 32, availableFrom: "2027-06-04", availableTo: "2027-08-31", facilities: ["kitchen"] },
  { id: "C", pricePerMonth: 1100, commuteMinutes: 10, availableFrom: "2027-06-01", availableTo: "2027-08-31", facilities: ["furnished", "kitchen"] },
  { id: "D", pricePerMonth: 1000, commuteMinutes: 12, availableFrom: "2027-05-25", availableTo: "2027-08-31", facilities: ["furnished", "kitchen", "gym"] },
  { id: "E", pricePerMonth: 820, commuteMinutes: 18, availableFrom: "2027-05-15", availableTo: "2027-08-15", facilities: ["furnished"] },
  { id: "F", pricePerMonth: 760, commuteMinutes: 40, availableFrom: "2027-06-01", availableTo: "2027-08-31", facilities: ["furnished", "kitchen"] },
  { id: "G", pricePerMonth: 930, commuteMinutes: 15, availableFrom: "2027-06-10", availableTo: "2027-08-31", facilities: ["furnished", "kitchen", "gym"] },
];

// Maya, the summer intern from the pitch deck.
const maya = (): Preferences => ({
  price: { ideal: 900, limit: 1050 },
  commute: { ideal: 20, limit: 35 },
  dates: { start: "2027-06-01", end: "2027-08-15", maxUncoveredDays: 5 },
  facilities: { furnished: "important", kitchen: "must" },
  importance: { price: 8, commute: 6, dates: 4, facilities: 2 },
});

const order = (prefs: Preferences) => rankListings(prefs, rooms).ranked.map((r) => `${r.listing.id} ${r.score}`);

test("MVP spec test case: drag-to-rank order price > commute > dates > space gives 77 / 73 / 54", () => {
  const prefs: Preferences = {
    price: { ideal: 900, limit: 1050 },
    commute: { ideal: 20, limit: 35 },
    dates: { start: "2027-06-01", end: "2027-08-15", maxUncoveredDays: 5 },
    facilities: { furnished: "nice" },
    priorityOrder: ["price", "commute", "dates", "facilities"],
  };
  const four = rooms.filter((r) => "ABCD".includes(r.id));
  const { ranked, filtered } = rankListings(prefs, four);
  assert.deepEqual(ranked.map((r) => `${r.listing.id} ${r.score}`), ["A 77", "D 73", "B 54"]);
  assert.deepEqual(filtered.map((f) => [f.listing.id, f.reasons[0].factor]), [["C", "price"]]);
  const w = weightsFor(prefs);
  assert.deepEqual([w.price, w.commute, w.dates, w.facilities].map((x) => Math.round(x * 100)), [40, 30, 20, 10]);
});

test("0–10 sliders at 8 / 6 / 4 / 2 give the same scores as the deck", () => {
  assert.deepEqual(order(maya()), ["A 77", "D 73", "B 54"]);
});

test("each card explains its score in plain English", () => {
  const [a, d, b] = rankListings(maya(), rooms).ranked;
  assert.equal(a.sentence, "#1 because it covers every date and is furnished; you give up $50 on price and 5 extra minutes of commute.");
  assert.deepEqual(a.gains.map((g) => g.label), ["Covers every date", "Furnished"]);
  assert.deepEqual(a.gives.map((g) => g.label), ["$50 over ideal", "+5 min commute"]);
  assert.equal(d.sentence, "#2 because it is a 12-min commute, covers every date and is furnished; you give up $100 on price.");
  assert.deepEqual(b.gives.map((g) => g.label), ["+12 min commute", "Opens 3 days late", "Not furnished"]);
});

test("caring more about commute moves Room D to the top", () => {
  const prefs = maya();
  prefs.importance = { ...prefs.importance, commute: 9 };
  assert.deepEqual(order(prefs), ["D 77", "A 75", "B 50"]);
});

test("filtered rooms come with the one change that brings them back", () => {
  const { filtered } = rankListings(maya(), rooms);
  assert.deepEqual(
    filtered.map((f) => [f.listing.id, f.reasons.map((r) => r.fix.kind).join("+")]),
    [["C", "priceLimit"], ["E", "facilityNeed"], ["F", "commuteLimit"], ["G", "maxUncoveredDays"]],
  );
  assert.equal(filtered[0].reasons[0].message, "$1,100 is $50 over your $1,050 limit");
  assert.equal(filtered[1].reasons[0].message, "No kitchen. You marked it Must");

  const loosened = applyFix(maya(), filtered[0].reasons[0].fix);
  assert.equal(loosened.price.limit, 1100);
  assert.deepEqual(order(loosened), ["A 80", "D 80", "C 60", "B 54"]); // tie goes to the cheaper room
  assert.equal(maya().price.limit, 1050); // applyFix doesn't change the original
});

test("swipe deck skips swiped rooms and keeps their ranks", () => {
  const { deck, nearMisses } = buildSwipeDeck(maya(), rooms, ["A"]);
  assert.deepEqual(deck.map((r) => `#${r.rank} ${r.listing.id}`), ["#2 D", "#3 B"]);
  assert.deepEqual(nearMisses.map((f) => f.listing.id), ["C", "E", "F", "G"]);
  assert.equal(buildSwipeDeck(maya(), rooms, ["A", "D", "B"]).deck.length, 0);
});

test("edge cases never produce NaN", () => {
  const zero = maya();
  zero.importance = { price: 0, commute: 0, dates: 0, facilities: 0 };
  assert.deepEqual(Object.values(weightsFor(zero)), [0.25, 0.25, 0.25, 0.25]);

  const strictDates = maya();
  strictDates.dates.maxUncoveredDays = 0;
  assert.deepEqual(order(strictDates), ["A 77", "D 73"]);

  const fixedBudget = maya();
  fixedBudget.price = { ideal: 900, limit: 900 };
  assert.deepEqual(order(fixedBudget), ["B 54"]);

  const noPicks = maya();
  noPicks.facilities = { kitchen: "must" };
  const top = rankListings(noPicks, rooms).ranked[0];
  assert.equal(top.factorScores.facilities, null);
  assert.equal(top.weights.facilities, 0);

  const backwards = maya();
  backwards.dates = { start: "2027-08-15", end: "2027-06-01", maxUncoveredDays: 5 };
  for (const r of rankListings(backwards, rooms).ranked) assert.ok(Number.isFinite(r.exactScore));
});

test("commute estimate follows the MVP spec formula", () => {
  assert.equal(estimateCommuteMinutes({ lat: 41.8268, lng: -71.4025 }, { lat: 41.8268, lng: -71.4025 }), 0);
  const tenKmNorth = { lat: 10 / 111.195, lng: 0 };
  assert.equal(estimateCommuteMinutes({ lat: 0, lng: 0 }, tenKmNorth), 60); // 8 + 10 × 1.3 ÷ 15 × 60
});

test("demo.html runs the current engine (run node ranking/build-demo.mjs if this fails)", () => {
  const html = readFileSync(new URL("./demo.html", import.meta.url), "utf8");
  assert.equal(engineInDemo(html), engineForDemo());
});

// ---------- v2 trust switch ("Prefer verified hosts") ----------
// The fixture from the MVP requirements (section 4) and the demo script.
const mvpRooms: Listing[] = [
  { id: "A", pricePerMonth: 950, commuteMinutes: 25, availableFrom: "2027-06-01", availableTo: "2027-08-15", facilities: ["furnished", "kitchen"] },
  { id: "B", pricePerMonth: 880, commuteMinutes: 32, availableFrom: "2027-06-04", availableTo: "2027-08-15", facilities: ["kitchen"] },
  { id: "C", pricePerMonth: 1100, commuteMinutes: 15, availableFrom: "2027-06-01", availableTo: "2027-08-15", facilities: ["furnished", "kitchen"] },
  { id: "D", pricePerMonth: 1000, commuteMinutes: 12, availableFrom: "2027-06-01", availableTo: "2027-08-15", facilities: ["furnished", "kitchen"] },
  { id: "E", pricePerMonth: 940, commuteMinutes: 25, availableFrom: "2027-06-01", availableTo: "2027-08-15", facilities: ["furnished", "kitchen"], trust: "caution", trustReason: "Landlord consent pending" },
];
const mvpOrder = (prefs: Preferences) => rankListings(prefs, mvpRooms).ranked.map((r) => `${r.listing.id} ${r.score}`);

test("trust switch on by default: A 77, D 73, E 67 (79.33 x 0.85), B 54; C is a near miss", () => {
  assert.deepEqual(mvpOrder(maya()), ["A 77", "D 73", "E 67", "B 54"]);
  const { filtered } = rankListings(maya(), mvpRooms);
  assert.deepEqual(filtered.map((f) => f.listing.id), ["C"]);
  assert.equal(filtered[0].reasons[0].message, "$1,100 is $50 over your $1,050 limit");
});

test("turning the trust switch off puts the cheaper caution sublet first at 79", () => {
  assert.deepEqual(mvpOrder({ ...maya(), preferVerified: false }), ["E 79", "A 77", "D 73", "B 54"]);
});

test("commute importance 9 makes D first (77, A 75); switch off then puts E first", () => {
  const prefs = maya();
  prefs.importance = { ...prefs.importance, commute: 9 };
  assert.deepEqual(mvpOrder(prefs), ["D 77", "A 75", "E 66", "B 50"]);
  assert.deepEqual(mvpOrder({ ...prefs, preferVerified: false }), ["E 78", "D 77", "A 75", "B 50"]);
});

test("a trust penalty is the first give-up and appears in the sentence", () => {
  const e = rankListings(maya(), mvpRooms).ranked.find((r) => r.listing.id === "E")!;
  assert.equal(e.trustFactor, 0.85);
  assert.equal(e.gives[0].factor, "trust");
  assert.equal(e.gives[0].label, "Landlord consent pending (−15%)");
  assert.equal(
    e.sentence,
    "#3 because it covers every date and is furnished; you give up 15% of the score (landlord consent pending), $40 on price and 5 extra minutes of commute.",
  );
  const a = rankListings(maya(), mvpRooms).ranked.find((r) => r.listing.id === "A")!;
  assert.ok(!a.gives.some((g) => g.factor === "trust"));
});

test("show-the-math adds up: points sum to baseScore, and exactScore = baseScore x trustFactor", () => {
  for (const r of rankListings(maya(), mvpRooms).ranked) {
    const sum = Object.values(r.points).reduce((s, p) => s + p, 0);
    assert.ok(Math.abs(sum - r.baseScore) < 1e-9);
    assert.ok(Math.abs(r.baseScore * r.trustFactor - r.exactScore) < 1e-9);
    assert.equal(r.score, Math.round(r.exactScore));
  }
});

test("outside listings get 0.7 and their own reason", () => {
  const outside: Listing = { ...mvpRooms[0], id: "O", trust: "outside" };
  const r = rankListings(maya(), [outside]).ranked[0];
  assert.equal(r.trustFactor, 0.7);
  assert.equal(r.score, Math.round(76.6667 * 0.7));
  assert.equal(r.gives[0].label, "Outside listing, not verified by Roomsure (−30%)");
});

test("demo.html shows the same rooms as the app (run node ranking/build-demo.mjs if this fails)", () => {
  const html = readFileSync(new URL("./demo.html", import.meta.url), "utf8");
  assert.equal(dataInDemo(html), dataForDemo().trim());
});
