import { Link } from "@tanstack/react-router";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { hostActions, useHost } from "@/lib/roomsure/host";
import { Button } from "@/components/ui/button";
import { money } from "@/components/roomsure/discover/format";

export function PublishedRooms() {
  const published = useHost((s) => s.published);
  if (!published.length) return null;

  const remove = async (id: string) => {
    hostActions.unpublish(id);
  };

  return (
    <section aria-labelledby="host-published" className="space-y-3">
      <h2 id="host-published" className="text-xl font-bold text-foreground">Your published rooms</h2>
      <ul className="space-y-2">
        {published.map((r) => {
          const caution = r.host.trust.level === "caution";
          return (
            <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-hairline bg-surface p-3">
              {r.photos[0] ? (
                <img src={r.photos[0]} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
              ) : (
                <span className="size-14 shrink-0 rounded-xl bg-primary-soft" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">{r.title}</p>
                <p className="tabular text-[13px] text-muted-foreground">{r.neighborhood} · {money(r.pricePerMonth)}/mo</p>
                <p className={`flex items-center gap-1 text-[12px] font-medium ${caution ? "text-caution" : "text-good"}`}>
                  {caution ? <ShieldAlert className="size-3.5" /> : <ShieldCheck className="size-3.5" />}
                  {caution && r.host.trust.level === "caution" ? `${r.host.trust.label}: ${r.host.trust.reason}` : r.host.trust.label}
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="soft" className="min-h-10"><Link to="/room/$id" params={{ id: r.id }}>View</Link></Button>
                <Button size="sm" variant="ghost" className="min-h-10" onClick={() => remove(r.id)}>Unpublish</Button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-[13px] text-muted-foreground">Demo listings live in this browser. Unpublishing removes a room from seekers' decks right away.</p>
    </section>
  );
}
