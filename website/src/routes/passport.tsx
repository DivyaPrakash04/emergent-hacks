import { createFileRoute } from "@tanstack/react-router";
import { PassportScreen } from "@/components/roomsure/passport/PassportScreen";
import { listingsQuery } from "@/lib/roomsure/queries";
import { DiscoverError, DiscoverPending } from "@/components/roomsure/discover/DiscoverStates";

export const Route = createFileRoute("/passport")({
  head: () => ({
    meta: [
      { title: "Your Roomsure Passport · Roomsure" },
      { name: "description", content: "Your simulated checks, your reservations, and a button to reset the demo." },
      { property: "og:title", content: "Your Roomsure Passport · Roomsure" },
      { property: "og:description", content: "Your simulated checks, your reservations, and a button to reset the demo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(listingsQuery),
  pendingComponent: DiscoverPending,
  errorComponent: DiscoverError,
  component: PassportScreen,
});
