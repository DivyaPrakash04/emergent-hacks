import { ReceiptText } from "lucide-react";
import type { Reservation } from "@/lib/roomsure/types";
import { money } from "@/components/roomsure/discover/format";

export function ReceiptCard({ reservation, title }: { reservation: Reservation; title: string }) {
  const date = new Date(reservation.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return (
    <div className="space-y-3 rounded-[var(--radius-card)] border border-hairline bg-surface p-4 shadow-soft">
      <div className="flex items-center gap-2">
        <ReceiptText className="size-5 text-primary" />
        <p className="font-semibold text-foreground">Reserved · {title}</p>
        <span className="ml-auto rounded-full bg-warm-soft px-2 py-0.5 text-[12px] font-semibold text-caution">Simulated</span>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-[13px]">
        <div><dt className="text-muted-foreground">Reservation</dt><dd className="font-semibold tabular-nums text-foreground">{reservation.confirmation}</dd></div>
        <div><dt className="text-muted-foreground">Amount</dt><dd className="font-semibold tabular-nums text-foreground">{money(reservation.amount)}</dd></div>
        <div><dt className="text-muted-foreground">Date</dt><dd className="font-semibold text-foreground">{date}</dd></div>
      </dl>
    </div>
  );
}
