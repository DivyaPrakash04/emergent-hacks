/**
 * Outside-listing scam check (MVP requirements section 5). Plain rules over pasted
 * text. Every quote is an exact substring of the text, so the UI can highlight it.
 * Claude may suggest extra signals; mergeSignals() keeps only those whose quote is
 * really in the text. Code, never the model, decides the verdict.
 */
import { estimateFairPrice, FAIR_BASELINES, NEIGHBORHOOD_ALIASES } from "./fairPrice";
import type { CheckFacts, CheckResult, ScamSignal, ScamSignalId, ScamVerdict } from "./types";

export const SIGNAL_INFO: Record<ScamSignalId, { severity: ScamSignal["severity"]; message: string }> = {
  payment_pressure: { severity: "high", message: "Asks for money before you've seen the room" },
  cannot_view: { severity: "medium", message: "You can't see the room before paying" },
  price_far_below_fair: { severity: "medium", message: "Price is far below the demo fair range" },
  urgency: { severity: "low", message: "Pressure to decide fast" },
  off_platform_contact: { severity: "low", message: "Moves the conversation off the platform" },
};

const RULES: { id: ScamSignalId; pattern: RegExp }[] = [
  { id: "payment_pressure", pattern: /\b(?:wire|send|transfer|pay)\s+(?:me\s+)?(?:the\s+|a\s+)?(?:\$[\d,]+\s+)?(?:deposit|money|payment|first month(?:'s rent)?)(?:\s+(?:today|now|first|upfront|up front|in advance|before (?:the )?viewing))?/gi },
  { id: "payment_pressure", pattern: /\b(?:gift cards?|bitcoin|crypto(?:currency)?|western union|moneygram|zelle|venmo|cash ?app)\b/gi },
  { id: "payment_pressure", pattern: /\bdeposit before (?:the )?(?:viewing|you see (?:it|the room)|seeing (?:it|the room))/gi },
  { id: "cannot_view", pattern: /\b(?:can(?:'|’)?t|cannot|can not|unable to|won(?:'|’)?t be able to)\s+(?:show|view|see)\s+(?:you\s+)?(?:the\s+)?(?:room|place|apartment|flat|unit|property)\b/gi },
  { id: "cannot_view", pattern: /\b(?:mail|post|ship|send)\s+(?:you\s+)?the\s+keys?\b/gi },
  { id: "cannot_view", pattern: /\b(?:working|living|stuck|currently)\s+(?:\w+\s+){0,2}abroad\b/gi },
  { id: "urgency", pattern: /\b(?:many|lots of|several|other|a lot of)\s+(?:people|others|applicants|students)\s+(?:are\s+)?(?:interested|asking|waiting|looking)\b/gi },
  { id: "urgency", pattern: /\b(?:pay|decide|act|book|reserve)\s+(?:today|now|immediately|asap|right away)\b/gi },
  { id: "urgency", pattern: /\b(?:first come,? first served|won(?:'|’)?t last|going fast)\b/gi },
  { id: "off_platform_contact", pattern: /\b(?:text|call|whatsapp|email|e-mail|message)\s+me\b(?:\s+(?:at|on))?(?:\s*(?:\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}|[\w.+-]+@[\w-]+(?:\.[\w-]+)+))?/gi },
];

function overlaps(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Rule signals with exact quotes, in text order. Overlapping matches keep the first. */
export function ruleSignals(text: string): ScamSignal[] {
  const hits: { id: ScamSignalId; start: number; end: number }[] = [];
  for (const { id, pattern } of RULES) {
    for (const m of text.matchAll(pattern)) {
      const quote = m[0].trim().replace(/[\s,;:]+$/, "");
      const start = m.index ?? 0;
      const hit = { id, start, end: start + quote.length };
      if (!hits.some((h) => overlaps(h, hit))) hits.push(hit);
    }
  }
  return hits
    .sort((a, b) => a.start - b.start)
    .map((h) => ({ id: h.id, ...SIGNAL_INFO[h.id], evidence: text.slice(h.start, h.end), source: "rules" as const }));
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/** Next occurrence of month/day on or after `today`, as YYYY-MM-DD. */
export function nextDate(monthName: string, day: number, today: Date = new Date()): string | null {
  const month = MONTHS.findIndex((m) => m.startsWith(monthName.toLowerCase().replace(/\.$/, "").slice(0, 3)));
  if (month < 0 || day < 1 || day > 31) return null;
  let year = today.getUTCFullYear();
  const todayKey = Date.UTC(year, today.getUTCMonth(), today.getUTCDate());
  if (Date.UTC(year, month, day) < todayKey) year += 1;
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Facts stated in the text. Anything not stated stays null ("Not stated"). */
export function extractFacts(text: string, today: Date = new Date()): CheckFacts & { baselineKey: string | null; priceText: string | null } {
  const lower = text.toLowerCase();
  const monthly = text.match(/\$\s?[\d,]{3,6}\s*(?:\/\s*(?:month|mo)\b|per month|a month|\/mo\b)/i);
  const anyPrice = text.match(/\$\s?[\d,]{3,6}/);
  const priceMatch = monthly ?? anyPrice;
  const price = priceMatch ? Number(priceMatch[0].replace(/[^\d]/g, "")) : null;

  let baselineKey: string | null = null;
  for (const alias of Object.keys(NEIGHBORHOOD_ALIASES).sort((a, b) => b.length - a.length)) {
    if (lower.includes(alias)) { baselineKey = NEIGHBORHOOD_ALIASES[alias]; break; }
  }

  const avail = text.match(/available\s+(?:from\s+)?([A-Za-z]{3,9}\.?)\s+(\d{1,2})/i);
  const availableFrom = avail ? nextDate(avail[1], Number(avail[2]), today) : null;

  let roomType: CheckFacts["roomType"] = null;
  if (/\bshared (?:room|bedroom)\b|\bshare a (?:room|bedroom)\b/i.test(text)) roomType = "shared";
  else if (/\b(?:private room|studio|own room|bedroom|room)\b/i.test(text)) roomType = "private";

  let furnished: boolean | null = null;
  if (/\bunfurnished\b/i.test(text)) furnished = false;
  else if (/\bfurnished\b/i.test(text)) furnished = true;

  return {
    price,
    priceText: priceMatch ? priceMatch[0] : null,
    neighborhood: baselineKey ? FAIR_BASELINES[baselineKey].label : null,
    baselineKey,
    availableFrom,
    roomType,
    furnished,
  };
}

const KNOWN_IDS = new Set(Object.keys(SIGNAL_INFO));

/**
 * Combine rule signals with Claude's suggestions. A suggestion survives only if its id
 * is known and its quote is an exact substring of the text that no rule already covers.
 */
export function mergeSignals(text: string, rules: ScamSignal[], suggestions: { id: string; evidence?: string }[]): ScamSignal[] {
  const merged = [...rules];
  for (const s of suggestions) {
    if (!KNOWN_IDS.has(s.id) || s.id === "price_far_below_fair") continue;
    const quote = (s.evidence ?? "").trim();
    if (!quote) continue;
    const start = text.indexOf(quote);
    if (start < 0) continue;
    const range = { start, end: start + quote.length };
    const covered = merged.some((m) => {
      if (!m.evidence) return false;
      const ms = text.indexOf(m.evidence);
      return ms >= 0 && overlaps(range, { start: ms, end: ms + m.evidence.length });
    });
    if (covered) continue;
    const id = s.id as ScamSignalId;
    merged.push({ id, ...SIGNAL_INFO[id], evidence: quote, source: "claude" });
  }
  return merged.sort((a, b) => text.indexOf(a.evidence ?? "") - text.indexOf(b.evidence ?? ""));
}

const VERDICT_LABELS: Record<ScamVerdict, string> = { high_risk: "High risk", caution: "Caution", no_issues_found: "No issues found" };

/** Any high signal, or two different medium signals: High risk. Any other signal: Caution. */
export function verdictFor(signals: ScamSignal[]): ScamVerdict {
  if (signals.some((s) => s.severity === "high")) return "high_risk";
  const mediumIds = new Set(signals.filter((s) => s.severity === "medium").map((s) => s.id));
  if (mediumIds.size >= 2) return "high_risk";
  return signals.length ? "caution" : "no_issues_found";
}

export interface CheckOptions {
  /** Claude's suggested signals, when Claude ran. Unverifiable ones are dropped. */
  suggestions?: { id: string; evidence?: string }[];
  /** Which path produced the read: "claude" only when the server's Claude call succeeded. */
  source?: "claude" | "rules";
  today?: Date;
}

/** The full check. The rules always run; the server's Claude path passes its suggestions in. */
export function checkListingRules(text: string, options: CheckOptions = {}): CheckResult {
  const { suggestions = [], source = "rules", today = new Date() } = options;
  const facts = extractFacts(text, today);
  const fairPrice = estimateFairPrice({
    baselineKey: facts.baselineKey,
    roomType: facts.roomType,
    price: facts.price,
    furnished: facts.furnished === true,
  });
  let signals = mergeSignals(text, ruleSignals(text), suggestions);
  if (fairPrice?.kind === "unusually_low") {
    signals = [{ id: "price_far_below_fair", ...SIGNAL_INFO.price_far_below_fair, evidence: facts.priceText ?? undefined, source: "rules" }, ...signals];
  }
  const verdict = verdictFor(signals);
  const { baselineKey: _b, priceText: _p, ...publicFacts } = facts;
  return { verdict, verdictLabel: VERDICT_LABELS[verdict], signals, facts: publicFacts, fairPrice, source };
}
