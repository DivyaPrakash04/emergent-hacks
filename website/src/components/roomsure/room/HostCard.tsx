import { BadgeCheck, TriangleAlert } from "lucide-react";
import type { RoomListing } from "@/lib/roomsure/types";

export function HostCard({ host }: { host: RoomListing["host"] }) {
  const ok = host.trust.level === "verified";
  const badges = ok ? ["Email", "ID", "Card"] : ["Email"];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span aria-hidden className="grid size-12 place-items-center rounded-full bg-primary-soft font-display text-lg font-bold text-primary">
          {host.name.slice(0, 2).toUpperCase()}
        </span>
        <div>
          <p className="font-semibold text-foreground">{host.name}</p>
          <p className="text-[13px] text-muted-foreground">Usually replies in {host.repliesIn}</p>
        </div>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {badges.map((b) => (
          <li key={b} className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-[13px] font-semibold text-primary">
            <BadgeCheck className="size-3.5" /> {b} verified · Simulated
          </li>
        ))}
      </ul>
      {host.trust.level === "caution" && (
        <p className="flex items-start gap-2 rounded-2xl bg-caution/12 p-3 text-[14px] text-caution">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {host.trust.reason}
        </p>
      )}
    </div>
  );
}
