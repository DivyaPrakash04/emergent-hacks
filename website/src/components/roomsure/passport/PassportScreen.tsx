import { Link } from "@tanstack/react-router";
import { useListings } from "@/lib/roomsure/queries";
import { useRoomsure } from "@/lib/roomsure/state";
import { Button } from "@/components/ui/button";
import { ReceiptCard } from "@/components/roomsure/chat/ReceiptCard";
import { PassportCard } from "./PassportCard";
import { ResetDemo } from "./ResetDemo";

export function PassportScreen() {
  const listings = useListings();
  const reservations = useRoomsure((s) => s.reservations);
  const list = Object.values(reservations);
  return (
    <div className="mx-auto max-w-xl space-y-8 px-4 py-6 lg:py-10">
      <h1 className="sr-only">Your Roomsure Passport</h1>
      <PassportCard />
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-foreground">Reservations</h2>
        {list.length ? (
          <ul className="space-y-3">
            {list.map((r) => (
              <li key={r.listingId}><ReceiptCard reservation={r} title={listings.find((l) => l.id === r.listingId)?.title ?? "Room"} /></li>
            ))}
          </ul>
        ) : (
          <div className="space-y-4 rounded-[var(--radius-card)] border border-dashed border-hairline bg-surface p-6 text-center">
            <p className="text-muted-foreground">No reservations yet. Find a room you love first.</p>
            <Button asChild variant="soft"><Link to="/discover">Go to Discover</Link></Button>
          </div>
        )}
      </section>
      <ResetDemo />
      <p className="text-[13px] text-muted-foreground">We never ask for card numbers or ID documents in this demo.</p>
    </div>
  );
}
