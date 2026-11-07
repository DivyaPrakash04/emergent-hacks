import type { CheckResult } from "@/lib/roomsure/types";
import { money } from "@/components/roomsure/discover/format";

export function CheckPriceBar({ fair }: { fair: CheckResult["fairPrice"] }) {
  if (!fair) return <p className="text-[15px] text-muted-foreground">Estimate unavailable</p>;
  const min = Math.min(fair.price, fair.low) * 0.85, max = Math.max(fair.price, fair.high) * 1.1;
  const pct = (n: number) => ((n - min) / (max - min)) * 100;
  const below = fair.price < fair.low;
  return (
    <div className="space-y-3">
      <span className={`inline-flex rounded-full px-3 py-1 text-[13px] font-semibold ${below ? "bg-risk/10 text-risk" : "bg-good/10 text-good"}`}>{fair.label} · demo estimate</span>
      <div className="relative pt-7">
        <div className="relative h-3 rounded-full bg-muted">
          <div className="absolute inset-y-0 rounded-full bg-good/35" style={{ left: `${pct(fair.low)}%`, width: `${pct(fair.high) - pct(fair.low)}%` }} />
        </div>
        <div className="absolute top-0 -translate-x-1/2 text-center" style={{ left: `${pct(fair.price)}%` }}>
          <span className="block whitespace-nowrap text-[13px] font-bold text-foreground">{money(fair.price)}</span>
          <span className="mx-auto mt-0.5 block h-6 w-1 rounded-full bg-foreground" />
        </div>
      </div>
      <p className="text-[13px] text-muted-foreground">Similar rooms nearby: {money(fair.low)} – {money(fair.high)} a month.</p>
    </div>
  );
}
