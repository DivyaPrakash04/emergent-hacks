import { AnimatePresence } from "motion/react";
import type { DeckCard } from "@/lib/roomsure/deck";
import type { Destination } from "@/lib/roomsure/types";
import { SwipeCard, type SwipeDir } from "./SwipeCard";

interface Props {
  cards: DeckCard[];
  destination: Destination;
  flipped: boolean;
  onFlip: () => void;
  onSwipe: (id: string, dir: SwipeDir) => void;
  exitDir: SwipeDir;
  enter: { id: string; dir: SwipeDir } | null;
  reduce: boolean;
}

/** Renders only the top 3 cards; the rest of the deck stays off the page. */
export function SwipeDeck({ cards, destination, flipped, onFlip, onSwipe, exitDir, enter, reduce }: Props) {
  const visible = cards.slice(0, 3);
  return (
    <div className="relative h-[clamp(440px,calc(100dvh-330px),600px)] w-full">
      <AnimatePresence custom={exitDir} initial={false}>
        {visible
          .map((card, index) => (
            <SwipeCard
              key={card.listing.id}
              card={card}
              index={index}
              destination={destination}
              flipped={index === 0 && flipped}
              onFlip={onFlip}
              onSwipe={(dir) => onSwipe(card.listing.id, dir)}
              enterFrom={enter?.id === card.listing.id ? enter.dir : null}
              reduce={reduce}
            />
          ))
          .reverse()}
      </AnimatePresence>
    </div>
  );
}
