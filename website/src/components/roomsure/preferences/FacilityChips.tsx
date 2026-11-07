import { Lock } from "lucide-react";
import type { Need } from "@/lib/roomsure/rankListings";
import { FACILITY_KEYS, facilityText } from "@/lib/roomsure/defaults";
import { cn } from "@/lib/utils";

const ORDER: Need[] = ["none", "nice", "important", "must"];
const LABEL: Record<Need, string> = { none: "Don't care", nice: "Nice", important: "Important", must: "Must" };
const LOOK: Record<Need, string> = {
  none: "border-hairline bg-surface text-muted-foreground",
  nice: "border-primary/30 bg-primary-soft text-primary",
  important: "border-primary bg-primary/15 text-primary",
  must: "border-primary bg-primary text-primary-foreground",
};

export function FacilityChips({ value, onChange }: { value: Record<string, Need>; onChange: (v: Record<string, Need>) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {FACILITY_KEYS.map((key) => {
        const need = value[key] ?? "none";
        const next = ORDER[(ORDER.indexOf(need) + 1) % ORDER.length]!;
        const label = facilityText(key).label;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange({ ...value, [key]: next })}
            aria-label={`${label}: ${LABEL[need]}. Tap to change to ${LABEL[next]}.`}
            className={cn("inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition-colors", LOOK[need])}
          >
            {need === "must" && <Lock className="size-3.5" aria-hidden />}
            {label}
            <span className="font-normal opacity-80">· {LABEL[need]}</span>
          </button>
        );
      })}
    </div>
  );
}
