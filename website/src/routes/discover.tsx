import { createFileRoute } from "@tanstack/react-router";
import { listingsQuery } from "@/lib/roomsure/queries";
import { DiscoverScreen } from "@/components/roomsure/discover/DiscoverScreen";
import { DiscoverError, DiscoverPending } from "@/components/roomsure/discover/DiscoverStates";

export const Route = createFileRoute("/discover")({
  head: () => ({
    meta: [
      { title: "Discover rooms · Roomsure" },
      { name: "description", content: "Swipe through rooms ranked by your trade-offs. Every score explained." },
      { property: "og:title", content: "Discover rooms · Roomsure" },
      { property: "og:description", content: "Swipe through rooms ranked by your trade-offs. Every score explained." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(listingsQuery),
  pendingComponent: DiscoverPending,
  errorComponent: DiscoverError,
  component: DiscoverScreen,
});
