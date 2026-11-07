// STAND-IN: offline rules parser for the intake text. Claude Code's real version replaces it.
import type { DeckPreferences } from "./deck";
import { DEFAULT_PREFERENCES } from "./defaults";
import type { Destination, IntakeQuestion } from "./types";
import type { Need } from "./rankListings";

const MONTHS = ["january","february","march","april","may","june","july","august","september","october","november","december"];
const YEAR = 2027;
const iso = (m: number, d: number) => `${YEAR}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const money = (s: string) => Number(s.replace(/,/g, ""));

const FACILITY_WORDS: Record<string, RegExp> = {
  furnished: /furnish/,
  kitchen: /kitchen/,
  laundry: /laundry|washer/,
  gym: /\bgym\b/,
  privateBath: /private bath/,
  ac: /\bac\b|a\/c|air condition/,
  parking: /parking/,
};

export interface ParsedIntake {
  preferences: DeckPreferences;
  destination: Destination;
  questions: IntakeQuestion[];
}

export function parseIntakeRules(text: string): ParsedIntake {
  const t = text.toLowerCase();
  const p: DeckPreferences = structuredClone(DEFAULT_PREFERENCES);
  p.facilities = {};
  const questions: IntakeQuestion[] = [];

  const destination: Destination = /brown|campus/.test(t) ? "campus" : "work";

  const monthRe = new RegExp(`(${MONTHS.join("|")})\\s+(\\d{1,2})`, "g");
  const dates = [...t.matchAll(monthRe)].map((m) => iso(MONTHS.indexOf(m[1]!), Number(m[2])));
  if (dates.length >= 2) p.dates = { ...p.dates, start: dates[0]!, end: dates[1]! };
  else questions.push({ id: "dates", text: "When do you need the room? For example, June 1 to August 15." });

  const prices = [...t.matchAll(/\$\s?([\d,]{3,})/g)].map((m) => money(m[1]!));
  if (prices.length >= 2) p.price = { ideal: Math.min(prices[0]!, prices[1]!), limit: Math.max(prices[0]!, prices[1]!) };
  else if (prices.length === 1) p.price = { ideal: prices[0]!, limit: Math.round((prices[0]! * 1.15) / 25) * 25 };
  else questions.push({ id: "price", text: "What's your monthly budget, and the most you'd pay?" });

  const commuteText = t.split(/\./).filter((s) => /commute|minute|\bmin\b/.test(s)).join(" ");
  const mins = [...commuteText.matchAll(/\b(\d{1,2})\b/g)].map((m) => Number(m[1]));
  const commuteNums = [...new Set(mins)].filter((n) => n >= 5 && n <= 60);
  if (commuteNums.length >= 2) p.commute = { ideal: Math.min(...commuteNums), limit: Math.max(...commuteNums) };
  else if (commuteNums.length === 1) p.commute = { ideal: commuteNums[0]!, limit: Math.min(60, commuteNums[0]! + 10) };

  const gap = t.match(/(\d{1,2})\s*days?'?\s*(?:gap|without)/);
  if (gap) p.dates.maxUncoveredDays = Math.min(14, Number(gap[1]));

  for (const [key, re] of Object.entries(FACILITY_WORDS)) {
    const sentence = t.split(/[.;,]/).find((s) => re.test(s));
    if (!sentence) continue;
    let need: Need = "nice";
    if (/matters a lot|really|important/.test(sentence)) need = "important";
    else if (/\bneed|\bmust|require/.test(sentence)) need = "must";
    p.facilities[key] = need;
  }

  return { preferences: p, destination, questions };
}
