import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, CircleDashed, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { buildDeck } from "@/lib/roomsure/deck";
import { LISTINGS } from "@/lib/roomsure/data/listings";
import {
  hostActions,
  placeholderPhoto,
  publishBlockers,
  toRoomListing,
  useHost,
  validateDraft,
  type HostDraft,
} from "@/lib/roomsure/host";
import { useRoomsure } from "@/lib/roomsure/state";
import type { RoomListing } from "@/lib/roomsure/types";
import { Button } from "@/components/ui/button";
import { CardFront } from "@/components/roomsure/discover/CardFront";
import { DraftCard } from "./DraftCard";

/** What the ranking needs before it can score the room, in plain words. Title and description aren't scored. */
const NEEDED_TO_RANK: Partial<Record<keyof HostDraft, string>> = {
  neighborhood: "pick the neighborhood",
  price: "set a price",
  availableTo: "fix the dates",
  minStayMonths: "make the dates cover your minimum stay",
};

const BLOCKERS_SHOWN = 3;
const CARD_BOX = "mx-auto h-[520px] w-full max-w-[400px] lg:h-[430px] lg:max-w-[360px]";

function joinList(items: string[]): string {
  return items.length < 2
    ? (items[0] ?? "")
    : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function PublishPanel() {
  const s = useHost((x) => x);
  const preferences = useRoomsure((x) => x.preferences);
  const destination = useRoomsure((x) => x.destination);
  const [published, setPublished] = useState<RoomListing | null>(null);
  const [showAllBlockers, setShowAllBlockers] = useState(false);

  const blockers = publishBlockers(s);
  const missing = [
    ...new Set(validateDraft(s.draft).flatMap((i) => NEEDED_TO_RANK[i.field] ?? [])),
  ];
  if (s.rightToRent === null) missing.push("confirm your right to rent in step 1");

  // Re-ranked on every change to the draft, so the score moves as the host types.
  const preview = useMemo(() => {
    if (missing.length) return null;
    const draft = { ...s.draft, title: s.draft.title.trim() || "Your room title" };
    const base = toRoomListing(
      { profile: s.profile, rightToRent: s.rightToRent, draft },
      { id: "host-preview", origin: typeof window === "undefined" ? "" : window.location.origin },
    );
    // No photo and no tour yet: don't promise a 3D walk-through on the cover.
    const room =
      draft.photos.length || draft.withTour
        ? base
        : { ...base, photos: [placeholderPhoto(draft.neighborhood, "Add a photo or 3D tour")] };
    const deck = buildDeck(preferences, [...LISTINGS, ...s.published, room], destination);
    return {
      card: deck.deck.find((c) => c.listing.id === room.id) ?? null,
      miss: deck.nearMisses.find((m) => m.listing.id === room.id) ?? null,
      total: deck.total,
    };
  }, [missing.length, s, preferences, destination]);

  const publish = () => {
    const room = hostActions.publish(window.location.origin);
    if (!room) {
      toast.error(
        "Couldn't publish. Check the list above, or free up browser storage by removing a photo.",
      );
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
        <p className="text-[14px] text-muted-foreground">
          Published (demo): visible to seekers on this device only, until the backend is connected.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild variant="hero">
            <Link to="/room/$id" params={{ id: published.id }}>
              See it as a seeker
            </Link>
          </Button>
          <Button variant="soft" onClick={() => setPublished(null)}>
            List another room
          </Button>
        </div>
      </div>
    );
  }

  const status = preview?.card
    ? `How Maya would see it: #${preview.card.rank} of ${preview.total} rooms that fit her, scoring ${preview.card.score}.`
    : preview
      ? "How Maya would see it: outside her limits right now."
      : `To see how Maya would rank it, ${joinList(missing)}.`;
  const shownBlockers = showAllBlockers ? blockers : blockers.slice(0, BLOCKERS_SHOWN);

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-[12px] font-semibold text-primary">
          <span
            className="size-1.5 rounded-full bg-primary motion-safe:animate-pulse"
            aria-hidden
          />{" "}
          Live preview · updates as you type
        </p>
        <p className="text-[14px] font-semibold text-foreground" aria-live="polite">
          {status}
        </p>
        <div className={CARD_BOX}>
          {preview?.card ? (
            <CardFront card={preview.card} destination={destination} interactive={false} />
          ) : (
            <DraftCard draft={s.draft} dimmed={!!preview} />
          )}
        </div>
        {preview?.miss && (
          <ul className="space-y-1 rounded-2xl bg-muted p-4 text-[14px] text-caution">
            {preview.miss.reasons.map((r) => (
              <li key={r.factor}>{r.message}</li>
            ))}
          </ul>
        )}
        <p className="text-[13px] text-muted-foreground">
          Other seekers rank it by their own trade-offs, so their scores differ.
        </p>
      </div>

      {blockers.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[14px] font-semibold text-foreground">Before you can publish</p>
          <ul className="space-y-1.5">
            {shownBlockers.map((b) => (
              <li key={b} className="flex items-start gap-2 text-[14px] text-foreground">
                <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted-foreground" /> {b}
              </li>
            ))}
          </ul>
          {blockers.length > BLOCKERS_SHOWN && (
            <button
              type="button"
              onClick={() => setShowAllBlockers((v) => !v)}
              className="min-h-11 text-[14px] font-semibold text-primary"
            >
              {showAllBlockers ? "Show fewer" : `Show ${blockers.length - BLOCKERS_SHOWN} more`}
            </button>
          )}
        </div>
      ) : (
        <p className="flex items-center gap-2 text-[14px] font-semibold text-good">
          <CheckCircle2 className="size-5" /> Everything checks out. Ready to publish.
        </p>
      )}

      <Button
        variant="hero"
        size="xl"
        className="w-full"
        disabled={blockers.length > 0}
        onClick={publish}
      >
        Publish room
      </Button>
      <p className="text-center text-[13px] text-muted-foreground">
        Demo: published rooms stay in this browser and are labeled as demo listings.
      </p>
    </div>
  );
}
