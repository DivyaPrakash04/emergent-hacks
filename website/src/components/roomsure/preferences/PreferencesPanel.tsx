import { forwardRef, type ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import type { DeckPreferences } from "@/lib/roomsure/deck";
import { UNVERIFIED_MULTIPLIER } from "@/lib/roomsure/deck";
import type { Factor } from "@/lib/roomsure/rankListings";
import type { Destination } from "@/lib/roomsure/types";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Field } from "./Field";
import { RangeSlider } from "./RangeSlider";
import { FacilityChips } from "./FacilityChips";

const FACTORS: { key: Factor; label: string }[] = [
  { key: "price", label: "Price" },
  { key: "commute", label: "Commute" },
  { key: "dates", label: "Dates" },
  { key: "facilities", label: "Facilities" },
];
const DESTS: { key: Destination; label: string }[] = [
  { key: "work", label: "Work, downtown" },
  { key: "campus", label: "Brown campus" },
];
const usd = (n: number) => "$" + n.toLocaleString("en-US");

interface Props {
  preferences: DeckPreferences;
  destination: Destination;
  onPreferences: (p: DeckPreferences) => void;
  onDestination: (d: Destination) => void;
  title?: string | undefined;
  footer?: ReactNode | undefined;
  className?: string | undefined;
}

/** The one preferences form: used on /start and on /discover (sheet + desktop panel). */
export const PreferencesPanel = forwardRef<HTMLElement, Props>(function PreferencesPanel(
  { preferences: p, destination, onPreferences, onDestination, title = "Your preferences", footer, className },
  ref,
) {
  const set = (patch: Partial<DeckPreferences>) => onPreferences({ ...p, ...patch });
  const imp = { price: 0, commute: 0, dates: 0, facilities: 0, ...p.importance };
  const sum = Object.values(imp).reduce((a, b) => a + b, 0);
  const penalty = Math.round((1 - UNVERIFIED_MULTIPLIER) * 100);

  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-labelledby="prefs-title"
      className={cn("space-y-6 rounded-[var(--radius-card)] border border-hairline bg-surface p-5 shadow-soft focus-visible:outline-2", className)}
    >
      <h2 id="prefs-title" className="text-xl font-bold text-foreground">{title}</h2>

      <Field label="Destination" id="dest-label">
        <div role="radiogroup" aria-labelledby="dest-label" className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
          {DESTS.map((d) => (
            <button
              key={d.key}
              type="button"
              role="radio"
              aria-checked={destination === d.key}
              onClick={() => onDestination(d.key)}
              className={cn(
                "min-h-10 rounded-full text-[14px] font-semibold transition-colors",
                destination === d.key ? "bg-surface text-primary shadow-soft" : "text-muted-foreground",
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Price per month" value={`ideal ${usd(p.price.ideal)} · limit ${usd(p.price.limit)}`}>
        <RangeSlider min={500} max={2000} step={25} value={[p.price.ideal, p.price.limit]}
          labels={["Ideal price", "Walk-away price limit"]}
          onChange={([ideal, limit]) => set({ price: { ideal, limit } })} />
      </Field>

      <Field label="Commute" value={`ideal ${p.commute.ideal} min · limit ${p.commute.limit} min`}>
        <RangeSlider min={5} max={60} step={1} value={[p.commute.ideal, p.commute.limit]}
          labels={["Ideal commute", "Longest commute"]}
          onChange={([ideal, limit]) => set({ commute: { ideal, limit } })} />
      </Field>

      <Field label="Dates">
        <div className="grid grid-cols-2 gap-3">
          {(["start", "end"] as const).map((k) => (
            <label key={k} className="space-y-1 text-[13px] text-muted-foreground">
              <span>{k === "start" ? "Move in" : "Move out"}</span>
              <input
                type="date"
                value={p.dates[k]}
                onChange={(e) => e.target.value && set({ dates: { ...p.dates, [k]: e.target.value } })}
                className="h-11 w-full rounded-xl border border-hairline bg-background px-3 text-[15px] text-foreground"
              />
            </label>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="text-[14px] text-foreground">Days without a room I can handle</span>
          <div className="flex items-center gap-2">
            <Step label="Fewer days" disabled={p.dates.maxUncoveredDays <= 0}
              onClick={() => set({ dates: { ...p.dates, maxUncoveredDays: p.dates.maxUncoveredDays - 1 } })}><Minus className="size-4" /></Step>
            <span className="w-6 text-center font-semibold tabular-nums" aria-live="polite">{p.dates.maxUncoveredDays}</span>
            <Step label="More days" disabled={p.dates.maxUncoveredDays >= 14}
              onClick={() => set({ dates: { ...p.dates, maxUncoveredDays: p.dates.maxUncoveredDays + 1 } })}><Plus className="size-4" /></Step>
          </div>
        </div>
      </Field>

      <Field label="Facilities" value="tap to change">
        <FacilityChips value={p.facilities} onChange={(facilities) => set({ facilities })} />
      </Field>

      <Field label="What matters most">
        <div className="space-y-4">
          {FACTORS.map((f) => (
            <div key={f.key} className="space-y-2">
              <div className="flex justify-between text-[14px]">
                <span className="text-foreground">{f.label} · {imp[f.key]}</span>
                <span className="tabular-nums text-muted-foreground">{sum ? Math.round((imp[f.key] / sum) * 100) : 25}% weight</span>
              </div>
              <Slider aria-label={`${f.label} importance`} min={0} max={10} step={1} value={[imp[f.key]]}
                onValueChange={([v]) => set({ importance: { ...imp, [f.key]: v ?? 0 } })} />
            </div>
          ))}
        </div>
      </Field>

      <div className="flex items-start justify-between gap-4 rounded-2xl bg-muted/60 p-4">
        <label htmlFor="prefer-verified" className="space-y-1">
          <span className="block text-[14px] font-semibold text-foreground">Prefer verified hosts</span>
          <span className="block text-[13px] text-muted-foreground">
            Rooms from unverified hosts score {penalty}% lower. You can turn this off.
          </span>
        </label>
        <Switch id="prefer-verified" checked={p.preferVerified !== false} onCheckedChange={(v) => set({ preferVerified: v })} />
      </div>

      {footer}
    </section>
  );
});

function Step({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} disabled={disabled}
      className="grid size-10 place-items-center rounded-full border border-hairline bg-surface text-foreground disabled:opacity-40">
      {children}
    </button>
  );
}
