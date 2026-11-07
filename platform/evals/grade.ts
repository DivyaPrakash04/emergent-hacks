/**
 * Graders for the Claude accuracy check: plain code, no judge model (approved plan).
 * Used by run-eval.mjs and checked with oracle/null answers in tests/eval-grader.test.ts.
 */
import type { CheckResult, IntakeResult } from "../lib/roomsure/types";
import type { CheckCase, FieldCheck, IntakeCase } from "./cases";

const PROTECTED_WORDS = /muslim|woman|female|religio|gender/i;

export function fieldOf(r: IntakeResult, path: string): unknown {
  if (path === "destination") return r.destination;
  return path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], r.preferences);
}

export function checkPasses(r: IntakeResult, k: FieldCheck): boolean {
  const v = fieldOf(r, k.field);
  if ("equals" in k) return v === k.equals;
  if ("oneOf" in k) return k.oneOf.includes((v ?? null) as string | null);
  if (v == null) return !!k.allowEmpty;
  return typeof v === "number" && v >= k.between[0] && v <= k.between[1];
}

export interface Graded {
  grade: Record<string, number>;
  explanation: Record<string, string>;
}

/** all_correct (headline) = every field right, nothing invented, and a question when one is needed. */
export function gradeIntake(c: IntakeCase, r: IntakeResult): Graded {
  const misses = c.checks.filter((k) => !checkPasses(r, k));
  const fields = c.checks.length ? (c.checks.length - misses.length) / c.checks.length : 1;
  const invented = (c.mustBeEmpty ?? []).filter((f) => (f === "destination" ? r.destination : (r.preferences as Record<string, unknown>)[f]) != null);
  const traits = PROTECTED_WORDS.test(JSON.stringify(r));
  const no_invention = invented.length || traits ? 0 : 1;
  const asks = !c.asksQuestion || (r.questions?.length ?? 0) > 0 ? 1 : 0;
  const all_correct = fields === 1 && no_invention && asks ? 1 : 0;
  const notes = [
    misses.length ? "wrong: " + misses.map((k) => `${k.field}=${JSON.stringify(fieldOf(r, k.field))}`).join(", ") : "",
    invented.length ? "invented: " + invented.join(", ") : "",
    traits ? "mentions a personal trait" : "",
    asks ? "" : "no follow-up question",
  ].filter(Boolean);
  return { grade: { all_correct, fields, no_invention, asks }, explanation: { all_correct: notes.join("; ") || "all checks pass" } };
}

/** verdict (headline); recall = expected flags found; precision = found flags that were expected (catches false alarms). */
export function gradeCheck(c: CheckCase, r: CheckResult): Graded {
  const found = [...new Set(r.signals.map((s) => s.id))];
  const expected = new Set<string>(c.signals);
  const recall = c.signals.length ? c.signals.filter((s) => found.includes(s)).length / c.signals.length : 1;
  const precision = found.length ? found.filter((s) => expected.has(s)).length / found.length : 1;
  const verdict = r.verdict === c.verdict ? 1 : 0;
  return {
    grade: { verdict, recall, precision },
    explanation: { verdict: `got ${r.verdict}, expected ${c.verdict}; found [${found.join(", ")}], expected [${c.signals.join(", ")}]` },
  };
}
