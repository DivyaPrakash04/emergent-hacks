import { motion } from "motion/react";
import { House } from "lucide-react";
import type { Fix, FilteredListing } from "@/lib/roomsure/rankListings";
import type { DeckListing } from "@/lib/roomsure/deck";
import { Button } from "@/components/ui/button";
import { money } from "./format";

interface Props {
  nearMisses: FilteredListing<DeckListing>[];
  onFix: (fix: Fix, title: string) => void;
}

export function OutOfCards({ nearMisses, onFix }: Props) {
  return (
    <div className="rounded-[var(--radius-card)] bg-surface p-5 shadow-soft">
      <span className="grid size-12 place-items-center rounded-full bg-warm-soft text-foreground">
        <House className="size-6" />
      </span>
      <h2 className="mt-3 text-2xl font-bold text-foreground">You've seen every room that fits</h2>
      {nearMisses.length > 0 ? (
        <>
          <p className="mt-1 text-[15px] text-muted-foreground">These came close. One change brings each one back.</p>
          <ul className="mt-4 space-y-3">
            {nearMisses.map(({ listing, reasons: [reason] }) => reason && (
              <motion.li layout key={listing.id} className="rounded-[18px] border border-hairline p-3">
                <div className="flex gap-3">
                  <img src={listing.photos[0]} alt="" className="size-14 rounded-[12px] object-cover" loading="lazy" />
                  <div className="min-w-0">
                    <p className="font-display font-bold leading-tight text-foreground">{listing.title}</p>
                    <p className="tabular text-[13px] text-muted-foreground">{money(listing.pricePerMonth)}/mo · {listing.neighborhood}</p>
                    <p className="mt-1 text-[14px] text-caution">{reason.message}</p>
                  </div>
                </div>
                <Button variant="soft" className="mt-3 h-11 w-full" onClick={() => onFix(reason.fix, listing.title)}>
                  {reason.fixLabel}
                </Button>
              </motion.li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-1 text-[15px] text-muted-foreground">Loosen a preference to see more rooms, or check your matches.</p>
      )}
    </div>
  );
}
