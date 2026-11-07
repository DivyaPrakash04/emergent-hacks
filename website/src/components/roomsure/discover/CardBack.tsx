import { Link } from "@tanstack/react-router";
import type { DeckCard } from "@/lib/roomsure/deck";
import { Button } from "@/components/ui/button";
import { MathBreakdown } from "./MathBreakdown";

export function CardBack({ card }: { card: DeckCard }) {
  return (
    <div className="flex h-full flex-col rounded-[var(--radius-card)] bg-surface p-5 shadow-soft">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Show the math</p>
      <h2 className="mt-1 text-xl font-bold leading-tight text-foreground">{card.listing.title}</h2>

      <div className="mt-4"><MathBreakdown card={card} /></div>

      <Button asChild variant="soft" size="xl" className="mt-auto w-full">
        <Link to="/room/$id" params={{ id: card.listing.id }} onClick={(e) => e.stopPropagation()}>
          See full details
        </Link>
      </Button>
    </div>
  );
}
