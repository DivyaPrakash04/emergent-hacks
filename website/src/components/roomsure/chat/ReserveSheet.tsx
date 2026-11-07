import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import { api } from "@/lib/roomsure/api";
import { actions, useRoomsure } from "@/lib/roomsure/state";
import type { RoomListing } from "@/lib/roomsure/types";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { money, shortDate } from "@/components/roomsure/discover/format";

export function ReserveSheet({ listing, open, onOpenChange }: { listing: RoomListing; open: boolean; onOpenChange: (o: boolean) => void }) {
  const dates = useRoomsure((s) => s.preferences.dates);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reduce = useReducedMotion();

  async function confirm() {
    setBusy(true); setError(null);
    try {
      const r = await api.reserve(listing.id);
      setDone(true);
      setTimeout(() => { actions.addReservation(r); onOpenChange(false); setDone(false); }, 1100);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The reservation didn't go through. Try again.");
    } finally { setBusy(false); }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-w-lg rounded-t-[var(--radius-card)] border-hairline bg-background">
        {done ? (
          <div className="grid place-items-center gap-3 py-10 text-center" role="status">
            <motion.span initial={reduce ? { opacity: 0 } : { scale: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
              className="grid size-16 place-items-center rounded-full bg-good text-primary-foreground"><Check className="size-8" /></motion.span>
            <p className="text-xl font-bold text-foreground">First month reserved</p>
          </div>
        ) : (
          <>
            <SheetHeader className="text-left">
              <SheetTitle className="text-xl">Reserve first month</SheetTitle>
              <SheetDescription><span className="rounded-full bg-warm-soft px-2 py-0.5 text-[12px] font-semibold text-caution">Simulated payment</span> No money moves in this demo.</SheetDescription>
            </SheetHeader>
            <dl className="my-5 space-y-2 rounded-2xl bg-surface p-4 text-[15px]">
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Room</dt><dd className="text-right font-semibold text-foreground">{listing.title}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Dates</dt><dd className="font-semibold text-foreground">{shortDate(dates.start)} – {shortDate(dates.end)}</dd></div>
              <div className="flex justify-between gap-3 border-t border-hairline pt-2"><dt className="text-muted-foreground">First month</dt><dd className="font-display text-xl font-bold text-primary">{money(listing.pricePerMonth)}</dd></div>
            </dl>
            {error && <p role="alert" className="mb-3 text-[14px] text-destructive">{error}</p>}
            <Button variant="hero" size="xl" className="w-full" disabled={busy} onClick={confirm}>
              {busy ? "Confirming…" : "Confirm reservation"}
            </Button>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
