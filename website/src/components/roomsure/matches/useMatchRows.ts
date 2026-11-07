import { useMemo } from "react";
import { buildDeck } from "@/lib/roomsure/deck";
import { useRoomsure } from "@/lib/roomsure/state";
import type { RoomListing } from "@/lib/roomsure/types";

export type MatchStatus = "matched" | "waiting" | "passed";
export interface MatchRow { listing: RoomListing; score: number | null; status: MatchStatus }

export function useMatchRows(listings: RoomListing[]) {
  const swipes = useRoomsure((s) => s.swipes);
  const replies = useRoomsure((s) => s.hostReplies);
  const preferences = useRoomsure((s) => s.preferences);
  const destination = useRoomsure((s) => s.destination);
  return useMemo(() => {
    const scores = new Map(buildDeck(preferences, listings, destination).deck.map((c) => [c.listing.id, c.score]));
    const rows: MatchRow[] = [];
    for (const l of listings) {
      const s = swipes[l.id];
      if (!s) continue;
      const status: MatchStatus = s === "pass" ? "passed" : replies[l.id] === "accepted" ? "matched" : "waiting";
      rows.push({ listing: l, score: scores.get(l.id) ?? null, status });
    }
    return rows;
  }, [swipes, replies, preferences, destination, listings]);
}
