import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { MotionConfig, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { api } from "@/lib/roomsure/api";
import { applyFix, buildDeck } from "@/lib/roomsure/deck";
import { useListings } from "@/lib/roomsure/queries";
import { actions, useRoomsure } from "@/lib/roomsure/state";
import type { Fix } from "@/lib/roomsure/rankListings";
import type { RoomListing } from "@/lib/roomsure/types";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DeckHeader, type DeckView } from "./DeckHeader";
import { SwipeDeck } from "./SwipeDeck";
import { DeckControls } from "./DeckControls";
import { DeckListView } from "./DeckListView";
import { OutOfCards } from "./OutOfCards";
import { MatchOverlay } from "./MatchOverlay";
import { LivePreferencesPanel } from "@/components/roomsure/preferences/LivePreferencesPanel";
import type { SwipeDir } from "./SwipeCard";

export function DiscoverScreen() {
  const listings = useListings();
  const preferences = useRoomsure((s) => s.preferences);
  const destination = useRoomsure((s) => s.destination);
  const swipeHistory = useRoomsure((s) => s.swipeHistory);
  const reduce = !!useReducedMotion();

  const { deck, nearMisses, total } = useMemo(
    () => buildDeck(preferences, listings, destination, swipeHistory),
    [preferences, listings, destination, swipeHistory],
  );

  const [view, setView] = useState<DeckView>("cards");
  const [flipped, setFlipped] = useState(false);
  const [exitDir, setExitDir] = useState<SwipeDir>(1);
  const [enter, setEnter] = useState<{ id: string; dir: SwipeDir } | null>(null);
  const [match, setMatch] = useState<RoomListing | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const panelRef = useRef<HTMLElement>(null);

  // Re-rank toast: only when preferences change and a different room lands on top.
  const topId = deck[0]?.listing.id;
  const lastPrefs = useRef(preferences);
  const lastTop = useRef(topId);
  useEffect(() => {
    if (lastPrefs.current !== preferences && topId && topId !== lastTop.current) {
      toast(`Re-ranked · ${deck[0]?.listing.title} is now #1`);
    }
    lastPrefs.current = preferences;
    lastTop.current = topId;
  }, [preferences, topId, deck]);

  const swipe = useCallback(
    (id: string, dir: SwipeDir) => {
      flushSync(() => {
        setExitDir(dir);
        setFlipped(false);
        setEnter(null);
      });
      actions.swipe(id, dir === 1 ? "interested" : "pass");
      if (dir === 1) {
        toast("Saved · the host is reviewing");
        actions.setHostReply(id, "reviewing");
        api.simulateHostReply(id).then((reply) => {
          actions.setHostReply(id, reply);
          if (reply === "accepted") setMatch(listings.find((l) => l.id === id) ?? null);
        });
      }
    },
    [listings],
  );

  const undo = useCallback(() => {
    const last = actions.undo();
    if (last) setEnter({ id: last.id, dir: last.choice === "interested" ? 1 : -1 });
    setFlipped(false);
  }, []);

  const adjust = () => {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      panelRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      panelRef.current?.focus({ preventScroll: true });
    } else setSheetOpen(true);
  };

  const fix = (f: Fix, title: string) => {
    actions.setPreferences(applyFix(preferences, f));
    toast(`${title} is back in your deck`);
  };

  // Keyboard: ← pass, → interested, ↑ flip, Z undo.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable || t.closest("[role=slider],[role=radiogroup],[role=tablist],[role=switch],[role=dialog],[aria-labelledby=prefs-title]"))) return;
      if (match || sheetOpen || view !== "cards") return;
      const top = deck[0];
      if (e.key === "z" || e.key === "Z") { e.preventDefault(); undo(); return; }
      if (!top) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); swipe(top.listing.id, -1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); swipe(top.listing.id, 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setFlipped((f) => !f); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deck, swipe, undo, match, sheetOpen, view]);

  const top = deck[0];

  return (
    <MotionConfig reducedMotion="user">
      {/* The deck takes the free width (a wide card from xl up); preferences get a fixed, readable column. */}
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:py-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-label="Room deck" className="mx-auto w-full max-w-[400px] space-y-4 lg:max-w-[440px] xl:max-w-[720px]">
          <DeckHeader position={total - deck.length + 1} total={total} view={view} onView={setView} onAdjust={adjust} />

          {view === "list" ? (
            deck.length ? <DeckListView cards={deck} onChoose={swipe} /> : <OutOfCards nearMisses={nearMisses} onFix={fix} />
          ) : top ? (
            <>
              <SwipeDeck
                cards={deck}
                destination={destination}
                flipped={flipped}
                onFlip={() => setFlipped((f) => !f)}
                onSwipe={swipe}
                exitDir={exitDir}
                enter={enter}
                reduce={reduce}
              />
              <DeckControls
                canUndo={swipeHistory.length > 0}
                disabled={!top}
                onUndo={undo}
                onPass={() => swipe(top.listing.id, -1)}
                onInterested={() => swipe(top.listing.id, 1)}
                onDetails={() => setFlipped((f) => !f)}
              />
              <p className="hidden text-center text-[13px] text-muted-foreground lg:block">
                ← pass · → interested · ↑ show the math · Z undo
              </p>
            </>
          ) : (
            <>
              <OutOfCards nearMisses={nearMisses} onFix={fix} />
              {swipeHistory.length > 0 && (
                <button type="button" onClick={undo} className="mx-auto block h-11 text-[14px] font-semibold text-primary">
                  Undo last swipe
                </button>
              )}
            </>
          )}
        </section>
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <LivePreferencesPanel ref={panelRef} className="max-h-[calc(100dvh-8rem)] overflow-y-auto" />
          </div>
        </aside>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-[var(--radius-card)] border-hairline bg-background">
          <SheetHeader>
            <SheetTitle className="sr-only">Your preferences</SheetTitle>
          </SheetHeader>
          <div className="max-h-[75dvh] overflow-y-auto pb-4"><LivePreferencesPanel className="border-0 shadow-none" /></div>
        </SheetContent>
      </Sheet>

      <MatchOverlay
        listing={match}
        onClose={() => setMatch(null)}
      />
    </MotionConfig>
  );
}
