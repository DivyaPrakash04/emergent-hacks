// The Claude adapter's safety logic, with a fake client: no network, no key, no cost.
import { test } from "node:test";
import assert from "node:assert/strict";
import Anthropic from "@anthropic-ai/sdk";
import { checkListing, readIntake, toIntakeResult } from "../lib/ai/claude";
import { DEMO_INTAKE_SENTENCE } from "../lib/roomsure/defaults";
import { OUTSIDE_EXAMPLES } from "../lib/roomsure/data/outside-examples";

const TODAY = new Date(Date.UTC(2026, 10, 7));

/** A stand-in for the SDK client: returns one canned response, or throws. */
function fakeClient(reply: { parsed?: unknown; stop_reason?: string; throws?: unknown }): Anthropic {
  return {
    beta: {
      messages: {
        parse: async () => {
          if (reply.throws) throw reply.throws;
          return {
            model: "claude-opus-5-5",
            usage: { input_tokens: 500, output_tokens: 80 },
            stop_reason: reply.stop_reason ?? "end_turn",
            content: [{ type: "text", text: JSON.stringify(reply.parsed ?? null) }],
            parsed_output: reply.parsed ?? null,
          };
        },
      },
    },
  } as unknown as Anthropic;
}

const emptyIntake = {
  destination: null, price: { ideal: null, limit: null }, commute: { ideal: null, limit: null },
  dates: { start: null, end: null, maxUncoveredDays: null }, facilities: [], questions: [],
};

test("no API key: intake uses the rules and says so", async () => {
  const { result, call } = await readIntake(DEMO_INTAKE_SENTENCE, TODAY);
  assert.equal(call.failure, "no_api_key");
  assert.equal(result.source, "rules");
  assert.deepEqual(result.preferences.price, { ideal: 900, limit: 1050 });
});

test("Claude's reading is validated and labeled as Claude", async () => {
  const parsed = {
    ...emptyIntake, destination: "work",
    price: { ideal: 900, limit: 1050 }, commute: { ideal: 20, limit: 35 },
    dates: { start: "2027-06-01", end: "2027-08-15", maxUncoveredDays: 5 },
    facilities: [{ key: "kitchen", level: "must" }, { key: "furnished", level: "important" }],
  };
  const { result, call } = await readIntake(DEMO_INTAKE_SENTENCE, TODAY, { client: fakeClient({ parsed }) });
  assert.equal(call.failure, undefined);
  assert.equal(result.source, "claude");
  assert.equal(result.destination, "work");
  assert.deepEqual(result.preferences.facilities, { kitchen: "must", furnished: "important" });
  assert.deepEqual(result.missing, []);
});

test("refusal and timeout fall back to the rules", async () => {
  const refused = await readIntake(DEMO_INTAKE_SENTENCE, TODAY, { client: fakeClient({ stop_reason: "refusal" }) });
  assert.equal(refused.call.failure, "refusal");
  assert.equal(refused.result.source, "rules");
  const timedOut = await readIntake(DEMO_INTAKE_SENTENCE, TODAY, { client: fakeClient({ throws: new Anthropic.APIConnectionTimeoutError() }) });
  assert.equal(timedOut.call.failure, "timeout");
  assert.equal(timedOut.result.source, "rules");
});

test("one budget number gets a suggested limit and a question; nothing stated stays missing", () => {
  const r = toIntakeResult({ ...emptyIntake, price: { ideal: 900, limit: null } });
  assert.deepEqual(r.preferences.price, { ideal: 900, limit: 1025 });
  assert.match(r.questions[0], /\$1,025/);
  assert.ok(r.missing.includes("Dates") && r.missing.includes("Destination"));
  assert.equal(r.preferences.dates, undefined);
});

test("bad values are dropped, not trusted", () => {
  const r = toIntakeResult({ ...emptyIntake, price: { ideal: -5, limit: null }, dates: { start: "June 1", end: "2027-08-15", maxUncoveredDays: null } });
  assert.equal(r.preferences.price, undefined);
  assert.equal(r.preferences.dates, undefined);
});

test("questions about personal traits are dropped", () => {
  const r = toIntakeResult({ ...emptyIntake, questions: ["Do you need a female-only house?", "Which dates do you need?"] });
  assert.deepEqual(r.questions, ["Which dates do you need?"]);
});

test("listing check: invented quotes are counted and never shown; the verdict is code's", async () => {
  const text = OUTSIDE_EXAMPLES.find((e) => e.id === "looks-normal")!.text;
  const parsed = { signals: [
    { id: "urgency", evidence: "before you decide" },          // really in the text
    { id: "payment_pressure", evidence: "wire the money now" }, // invented
  ] };
  const { result, invented } = await checkListing(text, TODAY, { client: fakeClient({ parsed }) });
  assert.equal(invented, 1);
  assert.equal(result.source, "claude");
  assert.deepEqual(result.signals.map((s) => s.evidence), ["before you decide"]);
  assert.equal(result.verdict, "caution");
});

test("listing check with no key still runs the rules", async () => {
  const text = OUTSIDE_EXAMPLES.find((e) => e.id === "too-good")!.text;
  const { result, call } = await checkListing(text, TODAY);
  assert.equal(call.failure, "no_api_key");
  assert.equal(result.source, "rules");
  assert.equal(result.verdict, "high_risk");
});
