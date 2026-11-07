import { Box } from "lucide-react";
import type { DeckCard } from "@/lib/roomsure/deck";
import type { Destination } from "@/lib/roomsure/types";
import { PhotoCarousel } from "./PhotoCarousel";
import { ReasonChips } from "./ReasonChips";
import { ScoreRing } from "./ScoreRing";
import { money, shortDate } from "./format";

export function CardFront({ card, destination, interactive }: { card: DeckCard; destination: Destination; interactive: boolean }) {
  const l = card.listing;
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-soft">
      <div className="relative h-[58%] shrink-0">
        <PhotoCarousel photos={l.photos} alt={l.title} interactive={interactive} />
        {l.scanUrl && (
          <span className="absolute left-3 top-7 inline-flex items-center gap-1 rounded-full bg-surface/95 px-2.5 py-1 text-[13px] font-semibold text-foreground">
            <Box className="size-3.5 text-primary" /> 3D tour
          </span>
        )}
        <div className="absolute right-3 top-7">
          <ScoreRing score={card.score} rank={card.rank} />
        </div>
        <div className="photo-fade pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-3 pt-16 text-primary-foreground">
          <h2 className="text-[22px] font-bold leading-tight">{l.title}</h2>
          <p className="tabular mt-1 text-[14px] font-medium opacity-95">
            {l.neighborhood} · <span className="font-bold">{money(l.pricePerMonth)}/mo</span> · {l.commuteMinutes} min to {destination}
          </p>
          <p className="tabular text-[13px] opacity-90">
            Free {shortDate(l.availableFrom)} – {shortDate(l.availableTo)}
          </p>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        <p className="text-[15px] leading-snug text-foreground">{card.sentence}</p>
        <ReasonChips card={card} />
      </div>
    </div>
  );
}
