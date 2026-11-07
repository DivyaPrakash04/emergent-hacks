// STAND-IN: offline rules checker for outside listings. Claude Code's real version replaces it.
import type { CheckResult, CheckSignal, ListingFacts, Severity } from "./types";

const RULES: { id: string; name: string; severity: Severity; re: RegExp }[] = [
  { id: "wire", name: "Asks for a wire deposit before viewing", severity: "high", re: /(send|wire)[^.]{0,40}(deposit|payment)[^.]{0,30}wire transfer|wire transfer/gi },
  { id: "no-viewing", name: "Can't show the room in person", severity: "high", re: /can't show the apartment in person|can't show (?:it|the room)[^.]*|currently overseas[^.]*/gi },
  { id: "keys-mail", name: "Offers to mail the keys", severity: "high", re: /mail you the keys/gi },
  { id: "pressure", name: "Pushes you to decide fast", severity: "medium", re: /decide within \d+ hours|many people are interested/gi },
  { id: "off-platform", name: "Wants to talk off the site", severity: "medium", re: /contact me only by email|not through the site/gi },
  { id: "no-consent", name: "Landlord hasn't agreed to the sublet", severity: "medium", re: /landlord doesn't know[^.,]*|don't contact them/gi },
  { id: "p2p-pay", name: "Asks for payment apps with no protection", severity: "low", re: /venmo or zelle|cash app/gi },
];

const TYPICAL: Record<string, number> = { "fox point": 980, downcity: 1060, "federal hill": 940, "college hill": 1100, elmhurst: 870 };

export function checkListingRules(text: string): CheckResult {
  const signals: CheckSignal[] = [];
  for (const r of RULES) {
    const quotes = [...new Set([...text.matchAll(r.re)].map((m) => m[0]))];
    if (quotes.length) signals.push({ id: r.id, name: r.name, severity: r.severity, quotes });
  }
  const facts = readFacts(text);
  const high = signals.filter((s) => s.severity === "high").length;
  const verdict = high ? "high" : signals.length ? "caution" : "clear";

  const typical = facts.neighborhood ? TYPICAL[facts.neighborhood.toLowerCase()] : undefined;
  let fairPrice: CheckResult["fairPrice"];
  if (typical && facts.price) {
    const low = Math.round(typical * 0.9), highP = Math.round(typical * 1.1);
    const label = facts.price < typical * 0.7 ? "Far below typical" : facts.price < low ? "Below typical" : facts.price > highP ? "Above typical" : "Fair price";
    fairPrice = { low, high: highP, typical, price: facts.price, label };
  }
  return { source: "rules", verdict, signals, facts, ...(fairPrice ? { fairPrice } : {}) };
}

function readFacts(text: string): ListingFacts {
  const t = text.toLowerCase();
  const price = text.match(/\$\s?([\d,]{3,5})\s*(?:\/|per |a )\s*(?:month|mo)/i);
  const hood = Object.keys(TYPICAL).find((n) => t.includes(n));
  const dates = text.match(/((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2})\s*(?:to|-|–)\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2})/i);
  const roomType = /studio/.test(t) ? "Studio" : /1 bedroom|one bedroom/.test(t) ? "1-bedroom apartment" : /shared apartment|roommates/.test(t) ? "Room in a shared apartment" : /private room/.test(t) ? "Private room" : null;
  return {
    price: price ? Number(price[1]!.replace(/,/g, "")) : null,
    neighborhood: hood ? hood.replace(/\b\w/g, (c) => c.toUpperCase()) : null,
    dates: dates ? `${dates[1]} to ${dates[2]}` : null,
    roomType,
    furnished: /unfurnished/.test(t) ? false : /furnished/.test(t) ? true : null,
  };
}
