import type { ListingFacts } from "@/lib/roomsure/types";
import { money } from "@/components/roomsure/discover/format";

export function FactsTable({ facts }: { facts: ListingFacts }) {
  const rows: [string, string | null][] = [
    ["Price", facts.price != null ? `${money(facts.price)}/mo` : null],
    ["Neighborhood", facts.neighborhood],
    ["Dates", facts.dates],
    ["Room type", facts.roomType],
    ["Furnished", facts.furnished == null ? null : facts.furnished ? "Yes" : "No"],
  ];
  return (
    <dl className="divide-y divide-hairline">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 py-2.5 text-[15px]">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className={v ? "text-right font-semibold text-foreground" : "text-muted-foreground"}>{v ?? "Not stated"}</dd>
        </div>
      ))}
    </dl>
  );
}
