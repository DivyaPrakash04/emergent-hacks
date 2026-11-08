import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft, Info } from "lucide-react";
import { chatSteps, openingMessages, type ChatMessage } from "@/lib/roomsure/chat";
import { useListings } from "@/lib/roomsure/queries";
import { useRoomsure } from "@/lib/roomsure/state";
import { Button } from "@/components/ui/button";
import { money } from "@/components/roomsure/discover/format";
import { Avatar } from "@/components/roomsure/matches/Avatar";
import { TypingDots } from "./TypingDots";
import { ReserveSheet } from "./ReserveSheet";
import { ReceiptCard } from "./ReceiptCard";
import { ChatRoomPanel } from "./ChatRoomPanel";

export function ChatScreen({ id }: { id: string }) {
  const listings = useListings();
  const listing = listings.find((l) => l.id === id);
  const reservation = useRoomsure((s) => s.reservations[id]);
  const verified = useRoomsure((s) => s.checks.id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [step, setStep] = useState(0);
  const [sheet, setSheet] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  const playHost = (lines: string[]) => {
    let t = 0;
    setTyping(true);
    lines.forEach((text, i) => {
      t += 900 + Math.min(text.length * 12, 900);
      timers.current.push(window.setTimeout(() => {
        setMessages((m) => [...m, { from: "host", text }]);
        setTyping(i < lines.length - 1);
      }, t));
    });
  };

  useEffect(() => {
    if (listing) playHost(openingMessages(listing.host.name, listing.title));
    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing?.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [messages, typing]);

  if (!listing) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">This chat isn't available</h1>
        <Button asChild variant="hero" className="mt-6"><Link to="/matches">Back to Matches</Link></Button>
      </div>
    );
  }

  const steps = chatSteps(listing.pricePerMonth);
  const next = steps[step];
  const reply = () => {
    if (!next || typing) return;
    setMessages((m) => [...m, { from: "seeker", text: next.reply }]);
    setStep((s) => s + 1);
    playHost(next.host);
  };

  // Laptops: the chat column plus the room beside it. The reserve bar below uses the same box and columns, so they line up.
  return (
    <div className="mx-auto max-w-2xl px-4 pb-72 pt-4 lg:grid lg:max-w-5xl lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-8">
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-16 z-20 -mx-4 flex items-center gap-3 border-b border-hairline bg-background/95 px-4 py-3 backdrop-blur">
          <Link to="/matches" aria-label="Back to Matches" className="grid size-11 place-items-center rounded-full hover:bg-muted"><ArrowLeft className="size-5" /></Link>
          <Avatar name={listing.host.name} className="size-11 bg-warm-soft text-caution" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">{listing.host.name}</p>
            <p className="truncate text-[13px] text-muted-foreground">{listing.title}</p>
          </div>
          <span className="rounded-full bg-good/10 px-2.5 py-1 text-[12px] font-semibold text-good">Matched</span>
        </header>

        <p className="my-4 flex items-center justify-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-center text-[13px] text-muted-foreground">
          <Info className="size-4" /> Chat demo · no real messages
        </p>

        <ol className="space-y-2.5" aria-live="polite">
          {messages.map((m, i) => (
            <motion.li key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={m.from === "host"
                ? "w-fit max-w-[80%] rounded-2xl rounded-bl-md bg-surface px-4 py-2.5 text-[15px] text-foreground shadow-soft"
                : "ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[15px] text-primary-foreground"}>
              {m.text}
            </motion.li>
          ))}
          {typing && <li><TypingDots /></li>}
        </ol>
        <div ref={endRef} />
      </div>

      <aside className="hidden pt-3 lg:block" aria-label="About this room">
        <ChatRoomPanel listing={listing} />
      </aside>

      <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 border-t border-hairline bg-background/95 pb-3 pt-3 backdrop-blur lg:bottom-0 lg:pl-24">
        <div className="mx-auto max-w-2xl px-4 lg:grid lg:max-w-5xl lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8">
          <div className="space-y-3">
            {next && (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={reply} disabled={typing}
                  className="min-h-11 rounded-full border border-primary/40 bg-surface px-4 text-[14px] font-semibold text-primary disabled:opacity-50">
                  {next.reply}
                </button>
              </div>
            )}
            {reservation ? (
              <ReceiptCard reservation={reservation} title={listing.title} />
            ) : (
              <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-hairline bg-surface p-3 shadow-soft">
                <div className="flex-1">
                  <p className="text-[13px] text-muted-foreground">First month</p>
                  <p className="font-display text-xl font-bold text-foreground">{money(listing.pricePerMonth)}</p>
                </div>
                {verified ? (
                  <Button variant="hero" size="lg" onClick={() => setSheet(true)}>Reserve first month</Button>
                ) : (
                  <Button asChild variant="soft" size="lg"><Link to="/passport">Verify your Passport to reserve</Link></Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ReserveSheet listing={listing} open={sheet} onOpenChange={setSheet} />
    </div>
  );
}
