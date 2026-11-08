import type { ReactNode } from "react";
import { AlertTriangle, MapPin } from "lucide-react";
import { facilityText } from "@/lib/roomsure/defaults";
import { FACILITY_KEYS, NEIGHBORHOODS, hostActions, priceCheck, scamFlags, useHost, type GuestPolicy, type RoomType } from "@/lib/roomsure/host";

const input = "h-11 w-full rounded-xl border border-hairline bg-background px-3 text-[15px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Field({ id, label, hint, children }: { id: string; label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[14px] font-semibold text-foreground">{label}</label>
      {children}
      {hint && <div className="text-[13px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

const ROOM_TYPES: { value: RoomType; label: string }[] = [
  { value: "private", label: "Private room" },
  { value: "shared", label: "Shared room" },
  { value: "studio", label: "Studio" },
];

const GUESTS: { value: GuestPolicy; label: string }[] = [
  { value: "fine", label: "Guests are fine" },
  { value: "ask", label: "Ask first" },
  { value: "no", label: "No overnight guests" },
];

const TONE: Record<string, string> = { good: "text-good", caution: "text-caution", risk: "text-risk" };

const num = (v: string): number | null => (v.trim() === "" ? null : Number(v));

export function RoomForm() {
  const d = useHost((s) => s.draft);
  const set = hostActions.updateDraft;
  const fair = priceCheck(d);
  const flags = scamFlags(d);

  return (
    <div className="space-y-5">
      <Field id="room-title" label="Title" hint="What seekers see first, like “Sunny room near Wayland Square”.">
        <input id="room-title" className={input} maxLength={80} value={d.title} onChange={(e) => set({ title: e.target.value })} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="room-hood" label="Neighborhood"
          hint={<span className="inline-flex items-start gap-1"><MapPin className="mt-0.5 size-3.5 shrink-0" />Seekers see the neighborhood only. You share the address after a match.</span>}>
          <select id="room-hood" className={input} value={d.neighborhood} onChange={(e) => set({ neighborhood: e.target.value })}>
            <option value="">Choose…</option>
            {NEIGHBORHOODS.map((n) => <option key={n.name} value={n.name}>{n.name}</option>)}
          </select>
        </Field>
        <Field id="room-type" label="Room type">
          <select id="room-type" className={input} value={d.roomType} onChange={(e) => set({ roomType: e.target.value as RoomType })}>
            {ROOM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="room-price" label="Price per month (USD)"
          hint={fair && <span className={TONE[fair.tone]}><span className="font-semibold">{fair.label}.</span> {fair.note}</span>}>
          <input id="room-price" type="number" inputMode="numeric" min={300} max={5000} step={10} className={`${input} tabular`}
            value={d.price ?? ""} onChange={(e) => set({ price: num(e.target.value) })} />
        </Field>
        <Field id="room-deposit" label="Deposit (USD, optional)" hint="Paid only after the seeker has viewed the room.">
          <input id="room-deposit" type="number" inputMode="numeric" min={0} step={10} className={`${input} tabular`}
            value={d.deposit ?? ""} onChange={(e) => set({ deposit: num(e.target.value) })} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="room-from" label="Available from">
          <input id="room-from" type="date" className={input} value={d.availableFrom} onChange={(e) => set({ availableFrom: e.target.value })} />
        </Field>
        <Field id="room-to" label="Available until">
          <input id="room-to" type="date" className={input} value={d.availableTo} onChange={(e) => set({ availableTo: e.target.value })} />
        </Field>
        <Field id="room-min" label="Minimum stay">
          <select id="room-min" className={input} value={d.minStayMonths} onChange={(e) => set({ minStayMonths: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5, 6].map((m) => <option key={m} value={m}>{m} month{m > 1 ? "s" : ""}</option>)}
          </select>
        </Field>
      </div>

      <label htmlFor="room-utilities" className="flex cursor-pointer items-center gap-2 text-[15px] text-foreground">
        <input id="room-utilities" type="checkbox" className="size-4 accent-[var(--color-primary)]" checked={d.utilitiesIncluded}
          onChange={(e) => set({ utilitiesIncluded: e.target.checked })} />
        Utilities are included in the price
      </label>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-[14px] font-semibold text-foreground">What the room has</legend>
        <div className="flex flex-wrap gap-2">
          {FACILITY_KEYS.map((k) => {
            const on = d.facilities.includes(k);
            return (
              <button key={k} type="button" aria-pressed={on}
                onClick={() => set({ facilities: on ? d.facilities.filter((f) => f !== k) : [...d.facilities, k] })}
                className={`min-h-10 rounded-full border px-4 text-[14px] font-medium transition-colors ${on ? "border-primary bg-primary text-primary-foreground" : "border-hairline bg-surface text-foreground hover:border-primary"}`}>
                {facilityText(k).label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-2xl border border-hairline p-4">
        <legend className="px-1 text-[14px] font-semibold text-foreground">House rules</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <label htmlFor="rule-smoking" className="flex cursor-pointer items-center gap-2 text-[15px] text-foreground">
            <input id="rule-smoking" type="checkbox" className="size-4 accent-[var(--color-primary)]" checked={d.rules.smoking}
              onChange={(e) => set({ rules: { ...d.rules, smoking: e.target.checked } })} />
            Smoking allowed
          </label>
          <label htmlFor="rule-pets" className="flex cursor-pointer items-center gap-2 text-[15px] text-foreground">
            <input id="rule-pets" type="checkbox" className="size-4 accent-[var(--color-primary)]" checked={d.rules.pets}
              onChange={(e) => set({ rules: { ...d.rules, pets: e.target.checked } })} />
            Pets allowed
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="rule-guests" label="Guests">
            <select id="rule-guests" className={input} value={d.rules.guests}
              onChange={(e) => set({ rules: { ...d.rules, guests: e.target.value as GuestPolicy } })}>
              {GUESTS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </Field>
          <Field id="rule-quiet" label="Quiet hours (optional)">
            <input id="rule-quiet" className={input} maxLength={40} placeholder="e.g. 10pm to 7am" value={d.rules.quietHours}
              onChange={(e) => set({ rules: { ...d.rules, quietHours: e.target.value } })} />
          </Field>
        </div>
      </fieldset>

      <Field id="room-desc" label="Description" hint={`${d.description.trim().length} of at least 40 characters. Light, space, who you live with, what's nearby.`}>
        <textarea id="room-desc" rows={5} maxLength={1200} value={d.description} onChange={(e) => set({ description: e.target.value })}
          className="w-full resize-y rounded-xl border border-hairline bg-background p-3 text-[15px] leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </Field>

      {flags.length > 0 && (
        <div role="alert" className="space-y-2 rounded-2xl border border-risk/40 bg-risk/10 p-4">
          <p className="flex items-center gap-2 font-semibold text-risk"><AlertTriangle className="size-5" /> Seekers would read this as a scam sign</p>
          <ul className="space-y-1 text-[14px] text-foreground">
            {flags.map((f) => <li key={f.name}>{f.name}: “{f.quotes[0]}”. Please reword it.</li>)}
          </ul>
          <p className="text-[13px] text-muted-foreground">Roomsure blocks listings that ask for money before a viewing, move contact off Roomsure, or pressure people.</p>
        </div>
      )}
    </div>
  );
}
