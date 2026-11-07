import { AlertOctagon, AlertTriangle, Info } from "lucide-react";
import type { CheckSignal } from "@/lib/roomsure/types";
import { SEVERITY_CHIP, SEVERITY_LABEL } from "./severity";

const ICON = { high: AlertOctagon, medium: AlertTriangle, low: Info } as const;
const ICON_CLS = { high: "text-risk", medium: "text-caution", low: "text-muted-foreground" } as const;

export function SignalList({ signals }: { signals: CheckSignal[] }) {
  if (!signals.length) return <p className="text-[15px] text-muted-foreground">We didn't spot any warning signs in this text.</p>;
  return (
    <ul className="divide-y divide-hairline">
      {signals.map((s) => {
        const I = ICON[s.severity];
        return (
          <li key={s.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
            <I className={`mt-0.5 size-5 shrink-0 ${ICON_CLS[s.severity]}`} />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-foreground">{s.name}</p>
                <span className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${SEVERITY_CHIP[s.severity]}`}>{SEVERITY_LABEL[s.severity]}</span>
              </div>
              {s.quotes.map((q) => <p key={q} className="text-[14px] italic text-muted-foreground">"{q}"</p>)}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
