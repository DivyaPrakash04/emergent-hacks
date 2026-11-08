import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, CircleDashed, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { buildDeck } from "@/lib/roomsure/deck";
import { LISTINGS } from "@/lib/roomsure/data/listings";
import { hostActions, publishBlockers, toRoomListing, useHost, validateDraft } from "@/lib/roomsure/host";
import { useRoomsure } from "@/lib/roomsure/state";
import type { RoomListing } from "@/lib/roomsure/types";
import { Button } from "@/components/ui/button";
import { CardFront } from "@/components/roomsure/discover/CardFront";

export function PublishPanel() {
  const s = useHost((x) => x);
  const preferences = useRoomsure((x) => x.preferences);
  const destination = useRoomsure((x) => x.destination);
  const [published, setPublished] = useState<RoomListing | null>(null);

  const blockers = publishBlockers(s);
  const canPreview = validateDraft(s.draft).length === 0 && s.rightToRent !== null;

  const preview = useMemo(() => {
    if (!canPreview) return null;
    const room = toRoomListing(s, { id: "host-preview", origin: typeof window === "undefined" ? "" : window.location.origin });
    const deck = buildDeck(preferences, [...LISTINGS, ...s.published, room], destination);
    return {
      card: deck.deck.find((c) => c.listing.id === room.id) ?? null,
      miss: deck.nearMisses.find((m) => m.listing.id === room.id) ?? null,
      total: deck.total,
    };
  }, [canPreview, s, preferences, destination]);

  const publish = async () => {
    const room = hostActions.publish(window.location.origin);
    if (!room) {
      toast.error("Couldn't publish. Check the list above, or free up browser storage by removing a photo.");
      return;
    }
    setPublished(room);
    toast.success("Published. Seekers on this device can now find it in Discover.");
  };

  if (published) {
    return (
      <div className="space-y-4 rounded-2xl bg-primary-soft/70 p-5 text-center">
        <PartyPopper className="mx-auto size-8 text-primary" />
        <p className="text-xl font-bold text-foreground">“{published.title}” is live</p>
        <p className="text-[14px] text-muted-foreground">Published (demo): visible to seekers on this device only, until the backend is connected.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild variant="hero"><Link to="/room/$id" params={{ id: published.id }}>See it as a seeker</Link></Button>
          <Button variant="soft" onClick={() => setPublished(null)}>List another room</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {preview ? (
        <div className="space-y-3">
          <p className="text-[14px] font-semibold text-foreground">
            {preview.card
              ? `How Maya would see it: #${preview.card.rank} of ${preview.total} rooms that fit her, scoring ${preview.card.score}.`
              : "How Maya would see it: outside her limits right now."}
          </p>
          {preview.card ? (
            <div className="mx-auto h-[520px] max-w-[400px]">
              <CardFront card={preview.card} destination={destination} interactive={false} />
            </div>
          ) : preview.miss ? (
            <ul className="space-y-1 rounded-2xl bg-muted p-4 text-[14px] text-caution">
              {preview.miss.reasons.map((r) => <li key={r.factor}>{r.message}</li>)}
            </ul>
          ) : null}
          <p className="text-[13px] text-muted-foreground">Other seekers rank it by their own trade-offs, so their scores differ.</p>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-hairline p-4 text-center text-[14px] text-muted-foreground">
          Your preview appears here once the room details are complete and you've confirmed your right to rent.
        </p>
      )}

      {blockers.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[14px] font-semibold text-foreground">Before you can publish</p>
          <ul className="space-y-1.5">
            {blockers.map((b) => (
              <li key={b} className="flex items-start gap-2 text-[14px] text-foreground">
                <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted-foreground" /> {b}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-[14px] font-semibold text-good">
          <CheckCircle2 className="size-5" /> Everything checks out. Ready to publish.
        </p>
      )}

      <Button variant="hero" size="xl" className="w-full" disabled={blockers.length > 0} onClick={publish}>
        Publish room
      </Button>
      <p className="text-center text-[13px] text-muted-foreground">Demo: published rooms stay in this browser and are labeled as demo listings.</p>
    </div>
  );
}
