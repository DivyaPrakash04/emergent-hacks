import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Box, CalendarDays, Check, Clock, Heart, Home, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/roomsure/api";
import { buildDeck } from "@/lib/roomsure/deck";
import { facilityText } from "@/lib/roomsure/defaults";
import { listingsQuery } from "@/lib/roomsure/queries";
import { actions, useRoomsure } from "@/lib/roomsure/state";
import { Button } from "@/components/ui/button";
import { money, shortDate } from "@/components/roomsure/discover/format";
import { ReasonChips } from "@/components/roomsure/discover/ReasonChips";
import { MathBreakdown } from "@/components/roomsure/discover/MathBreakdown";
import { RoomGallery } from "./RoomGallery";
import { Section } from "./Section";
import { DateFit } from "./DateFit";
import { FairPriceBar } from "./FairPriceBar";
import { HostCard } from "./HostCard";
import { TourOverlay } from "./TourOverlay";

function roomType(title: string) {
  const t = title.toLowerCase();
  if (t.includes("studio")) return "Whole studio";
  if (t.includes("suite")) return "Private suite";
  return "Private room in a shared home";
}

export function RoomScreen({ id }: { id: string }) {
  const navigate = useNavigate();
  const { data: listings } = useSuspenseQuery(listingsQuery);
  const preferences = useRoomsure((s) => s.preferences);
  const destination = useRoomsure((s) => s.destination);
  const [tour, setTour] = useState(false);

  const listing = listings.find((l) => l.id === id);
  const { card, miss } = useMemo(() => {
    const d = buildDeck(preferences, listings, destination);
    return { card: d.deck.find((c) => c.listing.id === id), miss: d.nearMisses.find((m) => m.listing.id === id) };
  }, [preferences, listings, destination, id]);

  if (!listing) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">We couldn't find that room</h1>
        <Button variant="hero" className="mt-6" onClick={() => navigate({ to: "/discover" })}>Back to Discover</Button>
      </div>
    );
  }

  const choose = (interested: boolean) => {
    actions.swipe(id, interested ? "interested" : "pass");
    if (interested) {
      toast("Saved · the host is reviewing");
      actions.setHostReply(id, "reviewing");
      api.simulateHostReply(id).then((r) => actions.setHostReply(id, r));
    }
    navigate({ to: "/discover" });
  };

  const facts = [
    { icon: Clock, text: `${listing.commute[destination]} min to ${destination === "work" ? "work" : "campus"}` },
    { icon: CalendarDays, text: `Available ${shortDate(listing.availableFrom)} – ${shortDate(listing.availableTo)}` },
    { icon: Home, text: roomType(listing.title) },
  ];

  return (
    <div className="mx-auto max-w-3xl pb-40 lg:px-4 lg:pt-6">
      <RoomGallery photos={listing.photos} alt={listing.title} hasScan={!!listing.scanUrl} onTour={() => setTour(true)} />

      <div className="space-y-5 px-4 pt-5 lg:px-0">
        <header className="space-y-1">
          <p className="text-[14px] text-muted-foreground">{listing.neighborhood}</p>
          <h1 className="text-3xl font-bold leading-tight text-foreground">{listing.title}</h1>
          <p className="font-display text-4xl font-extrabold text-primary">{money(listing.pricePerMonth)}<span className="text-lg font-semibold text-muted-foreground">/mo</span></p>
        </header>

        <ul className="space-y-2.5">
          {facts.map(({ icon: I, text }) => (
            <li key={text} className="flex items-center gap-3 text-[15px] text-foreground"><I className="size-5 text-primary" />{text}</li>
          ))}
          <li className="flex items-start gap-3 text-[15px] text-foreground">
            <Check className="mt-0.5 size-5 text-primary" />
            <span>{listing.facilities.map((f) => facilityText(f).label).join(" · ") || "No listed facilities"}</span>
          </li>
        </ul>
        <p className="text-[15px] leading-relaxed text-muted-foreground">{listing.description}</p>

        {card ? (
          <>
            <Section title={`Why it's #${card.rank}`}>
              <p className="text-[15px] leading-relaxed text-foreground">{card.sentence}</p>
              <ReasonChips card={card} max={4} />
            </Section>
            <Section title="Show the math"><MathBreakdown card={card} /></Section>
          </>
        ) : miss ? (
          <Section title="Why it's not in your deck">
            <ul className="space-y-1 text-[15px] text-caution">{miss.reasons.map((r) => <li key={r.factor}>{r.message}</li>)}</ul>
          </Section>
        ) : null}

        <Section title="How well it fits your dates">
          <DateFit stay={preferences.dates} room={{ from: listing.availableFrom, to: listing.availableTo }} />
        </Section>
        <Section title="Fair price"><FairPriceBar price={listing.pricePerMonth} fair={listing.fairPrice} /></Section>
        <Section title="Your host"><HostCard host={listing.host} /></Section>

        <Button variant="soft" size="xl" className="h-16 w-full text-[17px]" onClick={() => setTour(true)}>
          <Box className="size-5" /> Walk the room in 3D
        </Button>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-40 border-t border-hairline bg-background/95 p-3 backdrop-blur lg:bottom-0 lg:pl-24">
        <div className="mx-auto flex max-w-3xl gap-3">
          <Button variant="outline" size="xl" className="flex-1" onClick={() => choose(false)}><X className="size-5" /> Pass</Button>
          <Button variant="hero" size="xl" className="flex-[2]" onClick={() => choose(true)}><Heart className="size-5" /> I'm interested</Button>
        </div>
      </div>

      <TourOverlay open={tour} onClose={() => setTour(false)} scanUrl={listing.scanUrl} title={listing.title} />
    </div>
  );
}
