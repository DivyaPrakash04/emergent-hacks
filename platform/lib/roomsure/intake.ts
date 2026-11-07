/**
 * Rule-based intake parser: the offline fallback when Claude is unavailable.
 * Reads a seeker's sentence into partial preferences. It only fills what the
 * sentence states; one stated number becomes the ideal, with a suggested limit the
 * seeker confirms through a follow-up question.
 */
import type { Need, Preferences } from "./rankListings";
import { nextDate } from "./scam";
import type { Destination, IntakeResult } from "./types";

const num = (s: string): number => Number(s.replace(/[^\d]/g, ""));
const money = (n: number): string => "$" + n.toLocaleString("en-US");

const FACILITY_WORDS: Record<string, RegExp> = {
  furnished: /(?<!un)furnish(?:ed|ing)?\b/i,
  kitchen: /\bkitchen\b/i,
  laundry: /\b(?:laundry|washer)\b/i,
  gym: /\bgym\b/i,
  privateBath: /\b(?:own|private)\s+bath(?:room)?\b/i,
  ac: /\b(?:a\/?c|air[- ]?con(?:ditioning)?)\b/i,
  parking: /\bparking\b/i,
};

function needFromClause(clause: string): Need {
  if (/\b(?:need|must|require|have to have|can(?:'|’)?t live without|non-negotiable)\b/i.test(clause)) return "must";
  if (/\b(?:matters? a lot|really (?:want|important|matters)|important|really need)\b/i.test(clause)) return "important";
  return "nice";
}

export function parseIntakeRules(text: string, today: Date = new Date()): IntakeResult {
  const prefs: Partial<Preferences> = {};
  const missing: string[] = [];
  const questions: string[] = [];

  // Destination
  let destination: Destination | undefined;
  if (/\b(?:campus|brown|class(?:es)?|college hill|studying)\b/i.test(text)) destination = "campus";
  else if (/\b(?:downtown|office|work(?:ing)?|intern(?:ing|ship)?|job)\b/i.test(text)) destination = "work";
  if (!destination) missing.push("Destination");

  // Dates: "June 1 to August 15"
  const MONTH = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?";
  const d = text.match(new RegExp(`\\b${MONTH}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:to|through|until|till|–|-)\\s*(?:${MONTH}\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\b`, "i"));
  const gap = text.match(/\b(?:up to|at most|max(?:imum)?(?: of)?)\s+(\d{1,2})\s+days?(?:'|’)?\s*(?:gap|without|uncovered)?/i) ?? text.match(/\b(\d{1,2})[\s-]*days?(?:'|’)?\s+gap\b/i);
  if (d) {
    const start = nextDate(d[1], Number(d[2]), today);
    const endMonth = d[3] ?? d[1];
    let end = start ? nextDate(endMonth, Number(d[4]), new Date(Date.parse(start))) : null;
    if (start && end && end < start) end = null;
    if (start && end) prefs.dates = { start, end, maxUncoveredDays: gap ? Number(gap[1]) : 3 };
  }
  if (!prefs.dates) missing.push("Dates");

  // Price: "around $900, $1,050 max"
  const limitMatch = text.match(/\$\s?([\d,]{3,6})\s*(?:max(?:imum)?|tops|at most|limit)\b/i) ?? text.match(/\b(?:max(?:imum)?|up to|no more than|at most)\s*(?:of\s+)?\$\s?([\d,]{3,6})/i);
  const idealMatch = text.match(/\b(?:budget|around|about|ideally|roughly|aiming for)\b[^$.]{0,20}\$\s?([\d,]{3,6})/i);
  const amounts = [...text.matchAll(/\$\s?([\d,]{3,6})/g)].map((m) => num(m[1]));
  const limit = limitMatch ? num(limitMatch[1]) : undefined;
  let ideal = idealMatch ? num(idealMatch[1]) : undefined;
  if (ideal === undefined && limit === undefined && amounts.length) ideal = amounts[0];
  if (ideal !== undefined && limit !== undefined && limit > ideal) prefs.price = { ideal, limit };
  else if (ideal !== undefined) {
    const suggested = Math.round((ideal * 1.15) / 25) * 25;
    prefs.price = { ideal, limit: suggested };
    questions.push(`Is ${money(suggested)} a month your walk-away limit?`);
  } else if (limit !== undefined) {
    prefs.price = { ideal: Math.round((limit * 0.85) / 25) * 25, limit };
  } else missing.push("Budget");

  // Commute: "ideally 20 minutes, 35 at most"
  const commuteClause = text.match(/commute[^.]*\./i)?.[0] ?? text.match(/\b\d{1,3}\s*(?:min(?:ute)?s?)\b[^.]*\./i)?.[0] ?? "";
  const mins = [...commuteClause.matchAll(/\b(\d{1,3})\b/g)].map((m) => Number(m[1])).filter((n) => n > 0 && n <= 120);
  if (mins.length >= 2) prefs.commute = { ideal: Math.min(mins[0], mins[1]), limit: Math.max(mins[0], mins[1]) };
  else if (mins.length === 1) {
    prefs.commute = { ideal: mins[0], limit: mins[0] + 15 };
    questions.push(`Is a ${mins[0] + 15}-minute commute the most you'd accept?`);
  } else missing.push("Commute");

  // Facilities, clause by clause: "I need a kitchen, furnished matters a lot"
  const facilities: Record<string, Need> = {};
  for (const clause of text.split(/[.,;]|\band\b/i)) {
    for (const [key, re] of Object.entries(FACILITY_WORDS)) {
      if (re.test(clause) && !/\b(?:don(?:'|’)?t (?:need|care)|no need|not needed|is fine)\b/i.test(clause)) {
        facilities[key] = needFromClause(clause);
      }
    }
  }
  if (Object.keys(facilities).length) prefs.facilities = facilities;

  if (missing.includes("Budget")) questions.push("What's your monthly budget, and the most you'd pay?");
  if (missing.includes("Dates")) questions.push("Which dates do you need the room for?");
  if (missing.includes("Destination")) questions.push("Will you commute to work downtown or to Brown's campus?");

  return { preferences: prefs, destination, missing, questions: questions.slice(0, 2), source: "rules" };
}
