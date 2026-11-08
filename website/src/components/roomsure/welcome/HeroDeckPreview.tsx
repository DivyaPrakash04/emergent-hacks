import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { buildDeck } from "@/lib/roomsure/deck";
import { LISTINGS } from "@/lib/roomsure/data/listings";
import { DEFAULT_DESTINATION, DEFAULT_PREFERENCES } from "@/lib/roomsure/defaults";
import { CardFront } from "@/components/roomsure/discover/CardFront";

const TILT = ["rotate-[6deg] translate-x-8", "-rotate-[5deg] -translate-x-8"];

/**
 * Shows the product on the welcome page: Maya's real #1 card from the demo data,
 * ranked by the same code as Discover, with the next two rooms peeking out behind it.
 * Uses static data and default preferences, so the server and browser render the same thing.
 */
export function HeroDeckPreview() {
  const reduce = useReducedMotion();
  const deck = useMemo(
    () => buildDeck(DEFAULT_PREFERENCES, LISTINGS, DEFAULT_DESTINATION).deck,
    [],
  );
  const [top, ...rest] = deck;
  if (!top) return null;

  const enter = (delay: number) =>
    reduce
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3 } }
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <figure className="mx-auto w-full max-w-[400px]">
      <div className="relative h-[500px]">
        {rest.slice(0, 2).map((c, i) => (
          <motion.div
            key={c.listing.id}
            {...enter(0.05 * i)}
            className="absolute inset-0"
            aria-hidden
          >
            <div
              className={`h-full w-full overflow-hidden rounded-[var(--radius-card)] border-4 border-surface bg-surface shadow-soft ${TILT[i]}`}
            >
              <img src={c.listing.photos[0]} alt="" className="h-full w-full object-cover" />
            </div>
          </motion.div>
        ))}
        <motion.div {...enter(0.12)} className="absolute inset-0">
          <CardFront card={top} destination={DEFAULT_DESTINATION} interactive={false} />
        </motion.div>
      </div>
      <figcaption className="mt-5 text-center text-[13px] text-muted-foreground">
        Maya's #1 right now, ranked by her own trade-offs · demo data
      </figcaption>
    </figure>
  );
}
