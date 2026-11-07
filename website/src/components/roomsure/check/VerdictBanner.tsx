import { ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import type { CheckResult } from "@/lib/roomsure/types";

const V = {
  high: { label: "High risk", icon: ShieldAlert, cls: "bg-risk text-primary-foreground" },
  caution: { label: "Caution", icon: TriangleAlert, cls: "bg-warm text-ink" },
  clear: { label: "No issues found", icon: ShieldCheck, cls: "bg-good text-primary-foreground" },
} as const;

export function VerdictBanner({ result }: { result: CheckResult }) {
  const v = V[result.verdict];
  const n = result.signals.length;
  return (
    <div role="status" className={`rounded-[var(--radius-card)] p-5 shadow-soft ${v.cls}`}>
      <div className="flex items-center gap-3">
        <v.icon className="size-7 shrink-0" />
        <h2 className="font-display text-2xl font-extrabold">{v.label}</h2>
      </div>
      <p className="mt-2 text-[15px] opacity-90">
        {result.verdict === "clear" ? "No issues found doesn't mean verified." : `${n} warning ${n === 1 ? "sign" : "signs"} in this listing.`}
      </p>
      <span className="mt-3 inline-flex rounded-full bg-surface/25 px-2.5 py-1 text-[12px] font-semibold">Outside · not verified by Roomsure</span>
    </div>
  );
}
