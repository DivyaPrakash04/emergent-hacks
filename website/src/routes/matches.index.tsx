import { createFileRoute } from "@tanstack/react-router";
import { MatchesScreen } from "@/components/roomsure/matches/MatchesScreen";
import { listingsQuery } from "@/lib/roomsure/queries";
import { DiscoverError, DiscoverPending } from "@/components/roomsure/discover/DiscoverStates";

export const Route = createFileRoute("/matches/")({
  head: () => ({
    meta: [
      { title: "Matches · Roomsure" },
      { name: "description", content: "Your likes and matches, sorted into Matches, Waiting and Passed." },
      { property: "og:title", content: "Matches · Roomsure" },
      { property: "og:description", content: "Your likes and matches, sorted into Matches, Waiting and Passed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(listingsQuery),
  pendingComponent: DiscoverPending,
  errorComponent: DiscoverError,
  component: MatchesScreen,
});
