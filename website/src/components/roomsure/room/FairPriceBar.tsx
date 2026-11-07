import type { FairPrice } from "@/lib/roomsure/types";
import { money } from "@/components/roomsure/discover/format";

const TONE = { good: "text-good bg-good/10", caution: "text-caution bg-caution/12", risk: "text-risk bg-risk/10" } as const;

/** Demo fair range = typical price ± 10%, shown on a wider scale with a marker for this room. */
export function FairPriceBar({ price, fair }: { price: number; fair: FairPrice }) {
  const low = Math.round((fair.typical * 0.9) / 10) * 10;
  const high = Math.round((fair.typical * 1.1) / 10) * 10;
  const min = Math.min(price, low) * 0.85, max = Math.max(price, high) * 1.1;
  const pct = (n: number) => ((n - min) / (max - min)) * 100;
  return (
    <div className="space-y-3">
      <span className={`inline-flex rounded-full px-3 py-1 text-[13px] font-semibold ${TONE[fair.tone]}`}>{fair.label} · demo estimate</span>
      <div className="relative pt-7">
        <div className="relative h-3 rounded-full bg-muted">
          <div className="absolute inset-y-0 rounded-full bg-good/35" style={{ left: `${pct(low)}%`, width: `${pct(high) - pct(low)}%` }} />
        </div>
        <div className="absolute top-0 -translate-x-1/2 text-center" style={{ left: `${pct(price)}%` }}>
          <span className="block whitespace-nowrap text-[13px] font-bold text-foreground">{money(price)}</span>
          <span className="mx-auto mt-0.5 block h-6 w-1 rounded-full bg-foreground" />
        </div>
      </div>
      <p className="text-[13px] text-muted-foreground">Similar rooms nearby: {money(low)} – {money(high)} a month.</p>
    </div>
  );
}
