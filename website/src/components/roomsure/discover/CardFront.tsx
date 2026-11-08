import { Box } from "lucide-react";
import type { DeckCard } from "@/lib/roomsure/deck";
import type { Destination } from "@/lib/roomsure/types";
import { PhotoCarousel } from "./PhotoCarousel";
import { ReasonChips } from "./ReasonChips";
import { ScoreRing } from "./ScoreRing";
import { money, shortDate } from "./format";

/**
 * Portrait card (photo on top) by default. When its container is 600px or wider
 * (the Discover deck on large screens), it becomes a wide card: photo left, details right.
 * This uses a container query, so small previews of the card stay portrait.
 */
export function CardFront({
  card,
  destination,
  interactive,
}: {
  card: DeckCard;
  destination: Destination;
  interactive: boolean;
}) {
  const l = card.listing;
  const dates = `Free ${shortDate(l.availableFrom)} – ${shortDate(l.availableTo)}`;
  return (
    <div className="@container h-full">
      <div className="flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-soft @min-[600px]:flex-row">
        <div className="relative h-[58%] shrink-0 @min-[600px]:h-full @min-[600px]:w-[56%]">
          <PhotoCarousel photos={l.photos} alt={l.title} interactive={interactive} />
          {l.scanUrl && (
            <span className="absolute left-3 top-7 inline-flex items-center gap-1 rounded-full bg-surface/95 px-2.5 py-1 text-[13px] font-semibold text-foreground">
              <Box className="size-3.5 text-primary" /> 3D tour
            </span>
          )}
          <div className="absolute right-3 top-7">
            <ScoreRing score={card.score} rank={card.rank} />
          </div>
          <div className="photo-fade pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-3 pt-16 text-primary-foreground @min-[600px]:hidden">
            <h2 className="text-[22px] font-bold leading-tight">{l.title}</h2>
            <p className="tabular mt-1 text-[14px] font-medium opacity-95">
              {l.neighborhood} · <span className="font-bold">{money(l.pricePerMonth)}/mo</span> ·{" "}
              {l.commuteMinutes} min to {destination}
            </p>
            <p className="tabular text-[13px] opacity-90">{dates}</p>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-4 @min-[600px]:gap-4 @min-[600px]:p-6">
          <div className="hidden space-y-1 border-b border-hairline pb-4 @min-[600px]:block">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
              {l.neighborhood}
            </p>
            <h2 className="text-[24px] font-bold leading-tight text-foreground">{l.title}</h2>
            <p className="tabular pt-1 text-[15px] text-foreground">
              <span className="text-[22px] font-bold text-primary">{money(l.pricePerMonth)}</span>
              /mo · {l.commuteMinutes} min to {destination}
            </p>
            <p className="tabular text-[14px] text-muted-foreground">{dates}</p>
          </div>
          <p className="text-[15px] leading-snug text-foreground">{card.sentence}</p>
          <ReasonChips card={card} />
        </div>
      </div>
    </div>
  );
}
