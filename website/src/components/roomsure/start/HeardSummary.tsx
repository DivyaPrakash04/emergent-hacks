import { CalendarDays, Check, Clock, Wallet } from "lucide-react";
import type { DeckPreferences } from "@/lib/roomsure/deck";
import { facilityText } from "@/lib/roomsure/defaults";
import type { Need } from "@/lib/roomsure/rankListings";
import type { Destination } from "@/lib/roomsure/types";
import { money, shortDate } from "@/components/roomsure/discover/format";

const NEED_ORDER: Need[] = ["must", "important", "nice"];
const NEED_LABEL: Record<Exclude<Need, "none">, string> = {
  must: "must",
  important: "matters a lot",
  nice: "nice to have",
};

/** The preferences in one glance: what the intake filled in (and what the seeker has changed since). */
export function HeardSummary({
  preferences: p,
  destination,
}: {
  preferences: DeckPreferences;
  destination: Destination;
}) {
  const wanted = Object.entries(p.facilities)
    .filter((e): e is [string, Exclude<Need, "none">] => e[1] !== "none")
    .sort((a, b) => NEED_ORDER.indexOf(a[1]) - NEED_ORDER.indexOf(b[1]))
    .map(([key, need]) => `${facilityText(key).label} (${NEED_LABEL[need]})`);
  const dates =
    p.dates.start && p.dates.end
      ? `${shortDate(p.dates.start)} – ${shortDate(p.dates.end)}, up to ${p.dates.maxUncoveredDays} days' gap`
      : "Not set yet";

  const rows = [
    {
      icon: Wallet,
      label: "Budget",
      value: `${money(p.price.ideal)} ideal, ${money(p.price.limit)} max`,
    },
    {
      icon: Clock,
      label: "Commute",
      value: `${p.commute.ideal} min ideal, ${p.commute.limit} max, to ${destination === "work" ? "work downtown" : "Brown campus"}`,
    },
    { icon: CalendarDays, label: "Dates", value: dates },
    {
      icon: Check,
      label: "Facilities",
      value: wanted.length ? wanted.join(", ") : "No must-haves",
    },
  ];

  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      {rows.map(({ icon: I, label, value }) => (
        <div key={label} className="flex gap-3 rounded-2xl bg-surface p-3">
          <I className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0">
            <dt className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </dt>
            <dd className="text-[14px] font-medium text-foreground">{value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
