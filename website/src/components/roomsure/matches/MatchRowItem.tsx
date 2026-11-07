import { Link } from "@tanstack/react-router";
import { MessageCircle, RotateCcw } from "lucide-react";
import { money } from "@/components/roomsure/discover/format";
import { Button } from "@/components/ui/button";
import { actions } from "@/lib/roomsure/state";
import { cn } from "@/lib/utils";
import type { MatchRow } from "./useMatchRows";

const CHIP = {
  matched: "bg-good/10 text-good",
  waiting: "bg-warm-soft text-caution",
  passed: "bg-muted text-muted-foreground",
};

export function MatchRowItem({ row }: { row: MatchRow }) {
  const { listing, score, status } = row;
  return (
    <li className="flex items-center gap-3 rounded-[var(--radius-card)] border border-hairline bg-surface p-3 shadow-soft">
      <img src={listing.photos[0]} alt="" className="size-20 shrink-0 rounded-2xl object-cover" />
      <div className="min-w-0 flex-1 space-y-1">
        <Link to="/room/$id" params={{ id: listing.id }} className="block truncate font-semibold text-foreground hover:underline">{listing.title}</Link>
        <p className="text-[14px] text-muted-foreground">
          {money(listing.pricePerMonth)}/mo{score != null && <> · score <span className="font-semibold text-foreground">{score}</span></>}
        </p>
        <span className={cn("relative inline-flex overflow-hidden rounded-full px-2.5 py-0.5 text-[12px] font-semibold", CHIP[status])}>
          {status === "matched" && "Matched · simulated"}
          {status === "waiting" && (<><span className="relative">Host reviewing…</span><span aria-hidden className="shimmer absolute inset-0" /></>)}
          {status === "passed" && "Passed"}
        </span>
      </div>
      {status === "matched" && (
        <Button asChild variant="hero" size="sm" className="min-h-11">
          <Link to="/matches/$id" params={{ id: listing.id }}><MessageCircle className="size-4" /> Chat</Link>
        </Button>
      )}
      {status === "passed" && (
        <Button variant="soft" size="sm" className="min-h-11" onClick={() => actions.unswipe(listing.id)}>
          <RotateCcw className="size-4" /> Bring back
        </Button>
      )}
    </li>
  );
}
