import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RoomListing } from "@/lib/roomsure/types";
import { Avatar } from "@/components/roomsure/matches/Avatar";
import { Confetti } from "@/components/roomsure/matches/Confetti";

const SPRING = { type: "spring", stiffness: 260, damping: 22 } as const;

export function MatchOverlay({ listing, onClose }: { listing: RoomListing | null; onClose: () => void }) {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!listing) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [listing, onClose]);

  return (
    <AnimatePresence>
      {listing && (
        <motion.div
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center overflow-hidden bg-golden px-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="match-title"
        >
          <div className="relative mb-8 h-56 w-72">
            <motion.img
              src={listing.photos[0]}
              alt=""
              className="absolute inset-x-6 inset-y-0 h-full w-60 rounded-[28px] object-cover shadow-soft"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85, rotate: -4 }}
              animate={{ opacity: 1, scale: 1, rotate: -3 }}
              transition={{ duration: 0.5 }}
            />
            <motion.div className="absolute -bottom-6 left-6"
              initial={reduce ? { opacity: 0 } : { x: -220, opacity: 0, rotate: -20 }}
              animate={{ x: 0, opacity: 1, rotate: -6 }} transition={{ ...SPRING, delay: 0.15 }}>
              <Avatar name="Maya Chen" className="size-24 border-4 border-surface text-3xl shadow-soft" />
            </motion.div>
            <motion.div className="absolute -bottom-6 right-6"
              initial={reduce ? { opacity: 0 } : { x: 220, opacity: 0, rotate: 20 }}
              animate={{ x: 0, opacity: 1, rotate: 6 }} transition={{ ...SPRING, delay: 0.15 }}>
              <Avatar name={listing.host.name} className="size-24 border-4 border-surface bg-warm-soft text-3xl text-caution shadow-soft" />
            </motion.div>
            <motion.span className="absolute -bottom-2 left-1/2 grid size-11 -translate-x-1/2 place-items-center rounded-full bg-surface text-primary shadow-soft"
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...SPRING, delay: 0.45 }}>
              <Heart className="size-5 fill-current" />
            </motion.span>
          </div>

          {!reduce && <Confetti />}

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="relative max-w-sm">
            <h2 id="match-title" className="font-display text-5xl font-extrabold text-ink">It's a match!</h2>
            <p className="mt-3 text-[17px] text-ink/80">The host of {listing.title} would love to have you.</p>
            <p className="mt-1 text-[13px] text-ink/60">Simulated host reply · demo</p>
            <div className="mt-8 flex flex-col gap-3">
              <Button asChild size="xl" className="bg-ink text-surface hover:bg-ink/90">
                <Link to="/matches/$id" params={{ id: listing.id }}>Message host</Link>
              </Button>
              <Button size="xl" variant="ghost" className="text-ink hover:bg-surface/25" onClick={onClose}>Keep swiping</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
