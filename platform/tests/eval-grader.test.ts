// Oracle/null check for the eval's graders (eval-audit: run known-good and known-bad
// answers through the grader before any paid run). Perfect answers must score 100%,
// empty or constant answers must fail, and one wrong value must be caught.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CHECK_CASES, INTAKE_CASES, type IntakeCase } from "../evals/cases";
import { gradeCheck, gradeIntake } from "../evals/grade";
import type { CheckResult, IntakeResult } from "../lib/roomsure/types";

function oracleIntake(c: IntakeCase): IntakeResult {
  const r: IntakeResult = { preferences: {}, missing: [], questions: c.asksQuestion ? ["A follow-up question?"] : [], source: "rules" };
  for (const k of c.checks) {
    const value = "equals" in k ? k.equals : "oneOf" in k ? k.oneOf[0] : k.between[0];
    if (value === null) continue;
    if (k.field === "destination") { r.destination = value as IntakeResult["destination"]; continue; }
    const parts = k.field.split(".");
    let o = r.preferences as Record<string, unknown>;
    for (const p of parts.slice(0, -1)) o = (o[p] ??= {}) as Record<string, unknown>;
    o[parts.at(-1)!] = value;
  }
  return r;
}
const nullIntake = (): IntakeResult => ({ preferences: {}, missing: [], questions: [], source: "rules" });

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

test("intake oracle scores 100% on every case", () => {
  for (const c of INTAKE_CASES) assert.equal(gradeIntake(c, oracleIntake(c)).grade.all_correct, 1, c.id);
});

test("intake null answer scores 0%", () => {
  assert.equal(mean(INTAKE_CASES.map((c) => gradeIntake(c, nullIntake()).grade.all_correct)), 0);
});

test("intake grader catches one wrong value and an invented field", () => {
  const demo = INTAKE_CASES[0];
  const wrong = oracleIntake(demo);
  wrong.preferences.price = { ideal: 900, limit: 1000 };
  assert.equal(gradeIntake(demo, wrong).grade.all_correct, 0);
  const vague = INTAKE_CASES.find((c) => c.id === "i11-vague")!;
  const invented = oracleIntake(vague);
  invented.preferences.price = { ideal: 800, limit: 950 };
  assert.equal(gradeIntake(vague, invented).grade.no_invention, 0);
  const traits = oracleIntake(INTAKE_CASES.find((c) => c.id === "i10-protected-traits")!);
  traits.questions = ["Do you want a female-only house?"];
  assert.equal(gradeIntake(INTAKE_CASES.find((c) => c.id === "i10-protected-traits")!, traits).grade.no_invention, 0);
});

const asCheck = (verdict: CheckResult["verdict"], ids: string[]): CheckResult => ({
  verdict, verdictLabel: "", facts: { price: null, neighborhood: null, availableFrom: null, roomType: null, furnished: null },
  fairPrice: null, source: "rules",
  signals: ids.map((id) => ({ id: id as CheckResult["signals"][number]["id"], severity: "low", message: "", source: "rules" })),
});

test("check oracle scores 100% on every metric", () => {
  for (const c of CHECK_CASES) {
    const g = gradeCheck(c, asCheck(c.verdict, c.signals)).grade;
    assert.deepEqual(g, { verdict: 1, recall: 1, precision: 1 }, c.id);
  }
});

test("check null answer ('No issues found' for everything) only matches the 3 clean cases", () => {
  const verdicts = CHECK_CASES.map((c) => gradeCheck(c, asCheck("no_issues_found", [])).grade.verdict);
  assert.equal(verdicts.reduce((a, b) => a + b, 0), 3); // majority-class baseline: 3 of 12
});

test("check grader penalizes a false alarm on a clean listing", () => {
  const clean = CHECK_CASES.find((c) => c.id === "c09-deposit-after-viewing")!;
  const g = gradeCheck(clean, asCheck("high_risk", ["payment_pressure"])).grade;
  assert.equal(g.verdict, 0);
  assert.equal(g.precision, 0);
});
