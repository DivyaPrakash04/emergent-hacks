// The Roomsure "brain": deck, demo data, fair price, scam rules, intake parser, mock API.
// These pin the demo path in demo-script.md. Run: npm test (from platform/).
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyFix, buildDeck, rankRoom } from "../lib/roomsure/deck";
import { LISTINGS } from "../lib/roomsure/data/listings";
import { OUTSIDE_EXAMPLES } from "../lib/roomsure/data/outside-examples";
import { DEFAULT_PREFERENCES, DEMO_INTAKE_SENTENCE, defaultPreferences } from "../lib/roomsure/defaults";
import { parseIntakeRules } from "../lib/roomsure/intake";
import { checkListingRules, mergeSignals, ruleSignals } from "../lib/roomsure/scam";
import { chatScript } from "../lib/roomsure/chat";
import * as api from "../lib/roomsure/mockApi";

const TODAY = new Date(Date.UTC(2026, 10, 7)); // the hackathon
const ids = (r: { deck: { listing: { id: string }; score: number }[] }) => r.deck.map((c) => `${c.listing.id} ${c.score}`);

test("Maya's deck matches the demo script", () => {
  const r = buildDeck(defaultPreferences(), LISTINGS, "work");
  assert.deepEqual(ids(r), [
    "fox-point-sunny 77",
    "downcity-studio 73",
    "federal-hill-sublet 67",
    "smith-hill-quiet 54",
    "west-end-shared 48",
    "armory-loft 38",
  ]);
  assert.equal(r.totalRanked, 6);
  assert.deepEqual(r.nearMisses.map((n) => n.listing.id).sort(), [
    "college-hill-attic", "elmhurst-garden", "mount-pleasant-sublet", "olneyville-room", "wayland-square-suite",
  ]);
  assert.equal(r.deck[0].sentence, "#1 because it covers every date and is furnished; you give up $50 on price and 5 extra minutes of commute.");
});

test("the demo's two flips: commute importance 9, then the trust switch off", () => {
  const c9 = defaultPreferences();
  c9.importance = { ...c9.importance, commute: 9 };
  assert.equal(ids(buildDeck(c9, LISTINGS, "work"))[0], "downcity-studio 77");
  assert.equal(ids(buildDeck({ ...c9, preferVerified: false }, LISTINGS, "work"))[0], "federal-hill-sublet 78");
  assert.equal(ids(buildDeck({ ...defaultPreferences(), preferVerified: false }, LISTINGS, "work"))[0], "federal-hill-sublet 79");
});

test("suspended listings never reach the seeker", () => {
  const r = buildDeck(defaultPreferences(), LISTINGS, "work");
  const all = [...r.deck.map((c) => c.listing.id), ...r.nearMisses.map((n) => n.listing.id)];
  assert.ok(!all.includes("jewelry-district-studio"));
  assert.deepEqual(rankRoom(defaultPreferences(), LISTINGS, "work", "jewelry-district-studio"), { card: null, nearMiss: null });
});

test("swiped rooms leave the deck but keep their ranks", () => {
  const r = buildDeck(defaultPreferences(), LISTINGS, "work", ["fox-point-sunny"]);
  assert.equal(r.deck[0].listing.id, "downcity-studio");
  assert.equal(r.deck[0].rank, 2);
  assert.equal(r.totalRanked, 6);
});

test("a near-miss fix brings the room back", () => {
  const prefs = defaultPreferences();
  const miss = buildDeck(prefs, LISTINGS, "work").nearMisses.find((n) => n.listing.id === "wayland-square-suite")!;
  assert.equal(miss.reasons[0].message, "$1,100 is $50 over your $1,050 limit");
  assert.equal(miss.reasons[0].fixLabel, "Raise your price limit to $1,100");
  const after = buildDeck(applyFix(prefs, miss.reasons[0].fix), LISTINGS, "work");
  assert.ok(after.deck.some((c) => c.listing.id === "wayland-square-suite"));
});

test("fair-price labels on cards", () => {
  const byId = Object.fromEntries(buildDeck(defaultPreferences(), LISTINGS, "work").deck.map((c) => [c.listing.id, c.fairPrice]));
  assert.equal(byId["fox-point-sunny"]?.label, "Fair price · demo estimate");
  assert.equal(byId["smith-hill-quiet"]?.kind, "above");
  assert.equal(byId["west-end-shared"], null); // shared room: estimate unavailable
});

test("intake rules read the demo sentence into Maya's preferences", () => {
  const r = parseIntakeRules(DEMO_INTAKE_SENTENCE, TODAY);
  assert.equal(r.source, "rules");
  assert.equal(r.destination, "work");
  assert.deepEqual(r.missing, []);
  assert.deepEqual(r.questions, []);
  assert.deepEqual(r.preferences.price, DEFAULT_PREFERENCES.price);
  assert.deepEqual(r.preferences.commute, DEFAULT_PREFERENCES.commute);
  assert.deepEqual(r.preferences.dates, DEFAULT_PREFERENCES.dates);
  assert.deepEqual(r.preferences.facilities, DEFAULT_PREFERENCES.facilities);
});

test("intake rules suggest a limit for one budget number and ask about what's missing", () => {
  const r = parseIntakeRules("Looking for a furnished room near campus, budget around $800.", TODAY);
  assert.equal(r.destination, "campus");
  assert.deepEqual(r.preferences.price, { ideal: 800, limit: 925 });
  assert.ok(r.missing.includes("Dates"));
  assert.ok(r.questions.length >= 1 && r.questions.length <= 2);
  assert.equal(r.preferences.facilities?.furnished, "nice");
});

test("high-risk sample: High risk with exact quotes", () => {
  const sample = OUTSIDE_EXAMPLES.find((e) => e.id === "too-good")!;
  const r = checkListingRules(sample.text, { today: TODAY });
  assert.equal(r.verdict, "high_risk");
  assert.equal(r.verdictLabel, "High risk");
  const quotes = r.signals.map((s) => s.evidence);
  for (const q of ["wire the $550 deposit today", "can't show the room", "mail you the keys", "many people are interested", "Text me at (401) 555-0147"]) {
    assert.ok(quotes.includes(q), `missing quote: ${q}`);
  }
  assert.ok(r.signals.some((s) => s.id === "price_far_below_fair"));
  for (const s of r.signals) if (s.evidence) assert.ok(sample.text.includes(s.evidence), `not an exact quote: ${s.evidence}`);
  assert.equal(r.facts.neighborhood, "Fox Point");
  assert.equal(r.facts.price, 550);
  assert.equal(r.facts.availableFrom, "2027-06-01");
  assert.equal(r.source, "rules");
});

test("every outside sample gets its expected verdict", () => {
  for (const e of OUTSIDE_EXAMPLES) assert.equal(checkListingRules(e.text, { today: TODAY }).verdict, e.expected, e.id);
});

test("Claude suggestions survive only with a known id and an exact quote", () => {
  const text = OUTSIDE_EXAMPLES.find((e) => e.id === "looks-normal")!.text;
  const merged = mergeSignals(text, ruleSignals(text), [
    { id: "urgency", evidence: "before you decide" },          // exact quote: kept
    { id: "urgency", evidence: "act now or lose it" },         // not in the text: dropped
    { id: "made_up_signal", evidence: "Downcity" },            // unknown id: dropped
  ]);
  assert.deepEqual(merged.map((s) => [s.id, s.evidence, s.source]), [["urgency", "before you decide", "claude"]]);
  assert.equal(checkListingRules(text, { suggestions: [], source: "claude" }).source, "claude");
});

test("chat script uses the host's first name and the room", () => {
  const room = LISTINGS[0];
  const s = chatScript(room);
  assert.match(s.opening[0].text, /^Hi Maya! I'm Lena\./);
  assert.equal(s.replies.length, 3);
});

test("mock API: suspended hidden, host replies, reserve amount from the listing", async () => {
  api.setMockDelayScale(0);
  const rooms = await api.getListings();
  assert.ok(!rooms.some((r) => r.trustStatus === "suspended"));
  assert.equal(await api.simulateHostReply("fox-point-sunny"), "accepted");
  assert.equal(await api.simulateHostReply("federal-hill-sublet"), "reviewing");
  const receipt = await api.reserve("fox-point-sunny");
  assert.equal(receipt.amount, 950);
  assert.equal(receipt.simulated, true);
  await assert.rejects(api.reserve("jewelry-district-studio"));
  assert.equal((await api.parseIntake(DEMO_INTAKE_SENTENCE)).source, "rules");
  assert.equal((await api.demoLogin()).name, "Maya Chen");
});

test("the backend's copy of the website's room prices matches website/ exactly", async () => {
  const { readFileSync } = await import("node:fs");
  const { WEBSITE_ROOMS } = await import("../lib/roomsure/data/website-rooms");
  const src = readFileSync(new URL("../../website/src/lib/roomsure/data/listings.ts", import.meta.url), "utf8");
  const fromWebsite: Record<string, { title: string; price: number }> = {};
  for (const m of src.matchAll(/id: "([^"]+)",\s*title: "([^"]+)"[\s\S]*?pricePerMonth: (\d+)/g)) {
    fromWebsite[m[1]] = { title: m[2], price: Number(m[3]) };
  }
  assert.ok(Object.keys(fromWebsite).length >= 8, "could not read the website's listings");
  assert.deepEqual(WEBSITE_ROOMS, fromWebsite);
});
