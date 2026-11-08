import { Link } from "@tanstack/react-router";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { useRoomsure } from "@/lib/roomsure/state";
import type { RoomListing } from "@/lib/roomsure/types";
import { Button } from "@/components/ui/button";
import { money, shortDate } from "@/components/roomsure/discover/format";

/** Laptop-only side panel: the room this chat is about, so the facts are in view when reserving. */
export function ChatRoomPanel({ listing }: { listing: RoomListing }) {
  const destination = useRoomsure((s) => s.destination);
  const trust = listing.host.trust;
  const rows = [
    { label: "Price", value: `${money(listing.pricePerMonth)}/mo` },
    {
      label: "Available",
      value: `${shortDate(listing.availableFrom)} – ${shortDate(listing.availableTo)}`,
    },
    {
      label: "Commute",
      value: `${listing.commute[destination]} min to ${destination === "work" ? "work" : "campus"}`,
    },
  ];

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-hairline bg-surface shadow-soft">
      {listing.photos[0] && (
        <img src={listing.photos[0]} alt="" className="aspect-[4/3] w-full object-cover" />
      )}
      <div className="space-y-4 p-4">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
            {listing.neighborhood}
          </p>
          <p className="text-lg font-bold leading-tight text-foreground">{listing.title}</p>
        </div>
        <dl className="space-y-1.5 text-[14px]">
          {rows.map((r) => (
            <div key={r.label} className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{r.label}</dt>
              <dd className="tabular text-right font-medium text-foreground">{r.value}</dd>
            </div>
          ))}
        </dl>
        <p
          className={`flex items-start gap-1.5 text-[13px] font-medium ${trust.level === "caution" ? "text-caution" : "text-good"}`}
        >
          {trust.level === "caution" ? (
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          ) : (
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          )}
          {trust.level === "caution" ? `${trust.label}: ${trust.reason}` : trust.label}
        </p>
        <Button asChild variant="soft" className="min-h-11 w-full">
          <Link to="/room/$id" params={{ id: listing.id }}>
            {listing.scanUrl ? "Room details and 3D tour" : "Room details"}
          </Link>
        </Button>
      </div>
    </div>
  );
}
