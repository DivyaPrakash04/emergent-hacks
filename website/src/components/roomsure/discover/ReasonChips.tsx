import { BadgeCheck, TriangleAlert } from "lucide-react";
import type { DeckCard } from "@/lib/roomsure/deck";

const chip = "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-semibold";
const TONE = {
  good: "bg-good/10 text-good",
  caution: "bg-caution/12 text-caution",
  risk: "bg-risk/10 text-risk",
} as const;

export function ReasonChips({ card, max = 2 }: { card: DeckCard; max?: number }) {
  const { gains, gives, listing } = card;
  const trust = listing.host.trust;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {gains.slice(0, max).map((g) => (
        <li key={"g" + g.label} className={`${chip} ${TONE.good}`}>{g.label}</li>
      ))}
      {gives.slice(0, max).map((g) => (
        <li key={"v" + g.label} className={`${chip} ${TONE.caution}`}>{g.label}</li>
      ))}
      <li className={`${chip} ${trust.level === "verified" ? "bg-primary-soft text-primary" : TONE.caution}`}>
        {trust.level === "verified" ? <BadgeCheck className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
        {trust.level === "verified" ? trust.label : trust.reason}
      </li>
      <li className={`${chip} ${TONE[listing.fairPrice.tone]}`}>{listing.fairPrice.label}</li>
    </ul>
  );
}
