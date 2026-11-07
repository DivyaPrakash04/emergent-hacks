import { useRef } from "react";
import { motion, useMotionValue, useTransform, type PanInfo } from "motion/react";
import type { DeckCard } from "@/lib/roomsure/deck";
import type { Destination } from "@/lib/roomsure/types";
import { CardFront } from "./CardFront";
import { CardBack } from "./CardBack";

export type SwipeDir = 1 | -1;

interface Props {
  card: DeckCard;
  index: number;
  destination: Destination;
  flipped: boolean;
  onFlip: () => void;
  onSwipe: (dir: SwipeDir) => void;
  enterFrom: SwipeDir | null;
  reduce: boolean;
}

const SPRING = { type: "spring", stiffness: 300, damping: 30 } as const;

export function SwipeCard({ card, index, destination, flipped, onFlip, onSwipe, enterFrom, reduce }: Props) {
  const isTop = index === 0;
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-320, 0, 320], [-12, 0, 12]);
  const interested = useTransform(x, [20, 120], [0, 1]);
  const pass = useTransform(x, [-120, -20], [1, 0]);
  const dragged = useRef(false);
  const ref = useRef<HTMLDivElement>(null);

  function onDragEnd(_: unknown, info: PanInfo) {
    const width = ref.current?.offsetWidth ?? 360;
    const far = Math.abs(info.offset.x) > width * 0.3;
    const fast = Math.abs(info.velocity.x) > 600;
    if (far || fast) onSwipe(info.offset.x > 0 || (fast && info.velocity.x > 0) ? 1 : -1);
    setTimeout(() => (dragged.current = false), 0);
  }

  return (
    <motion.div
      ref={ref}
      layout
      custom={enterFrom}
      className="absolute inset-0 perspective-card"
      style={{ x, rotate: reduce ? 0 : rotate, zIndex: 10 - index, touchAction: "pan-y" }}
      initial={
        enterFrom
          ? reduce ? { opacity: 0 } : { x: enterFrom * 520, rotate: enterFrom * 16, opacity: 0 }
          : { scale: 0.85, y: 30, opacity: 0 }
      }
      animate={{ scale: 1 - index * 0.05, y: index * 10, opacity: 1, x: 0 }}
      variants={{
        exit: (dir: SwipeDir) =>
          reduce
            ? { opacity: 0, transition: { duration: 0.25 } }
            : { x: dir * 640, rotate: dir * 22, opacity: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
      }}
      exit="exit"
      transition={SPRING}
      drag={isTop ? "x" : false}
      dragSnapToOrigin
      dragElastic={0.9}
      onDragStart={() => (dragged.current = true)}
      onDragEnd={onDragEnd}
      aria-hidden={!isTop}
    >
      <motion.div
        className="relative h-full w-full cursor-grab preserve-3d active:cursor-grabbing"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={reduce ? { duration: 0 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        onClick={() => { if (isTop && !dragged.current) onFlip(); }}
      >
        <div className="absolute inset-0 backface-hidden" style={{ visibility: reduce && flipped ? "hidden" : "visible" }}>
          <CardFront card={card} destination={destination} interactive={isTop} />
        </div>
        <div
          className="absolute inset-0 backface-hidden"
          style={{ transform: "rotateY(180deg)", visibility: reduce && !flipped ? "hidden" : "visible" }}
        >
          {isTop && <CardBack card={card} />}
        </div>
      </motion.div>

      {isTop && (
        <>
          <motion.span
            style={{ opacity: interested }}
            className="pointer-events-none absolute left-5 top-24 -rotate-12 rounded-[12px] border-4 border-primary bg-surface/80 px-3 py-1 font-display text-2xl font-extrabold tracking-wider text-primary"
          >
            INTERESTED
          </motion.span>
          <motion.span
            style={{ opacity: pass }}
            className="pointer-events-none absolute right-5 top-24 rotate-12 rounded-[12px] border-4 border-muted-foreground bg-surface/80 px-3 py-1 font-display text-2xl font-extrabold tracking-wider text-muted-foreground"
          >
            PASS
          </motion.span>
        </>
      )}
    </motion.div>
  );
}
