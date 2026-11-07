import { createFileRoute } from "@tanstack/react-router";
import { listingsQuery } from "@/lib/roomsure/queries";
import { RoomScreen } from "@/components/roomsure/room/RoomScreen";
import { DiscoverError, DiscoverPending } from "@/components/roomsure/discover/DiscoverStates";

export const Route = createFileRoute("/room/$id")({
  head: () => ({
    meta: [
      { title: "Room details · Roomsure" },
      { name: "description", content: "Photos, why this room ranked where it did, the math, host trust, fair price and a 3D tour." },
      { property: "og:title", content: "Room details · Roomsure" },
      { property: "og:description", content: "Photos, why this room ranked where it did, the math, host trust, fair price and a 3D tour." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(listingsQuery),
  pendingComponent: DiscoverPending,
  errorComponent: DiscoverError,
  component: RoomPage,
});

function RoomPage() {
  const { id } = Route.useParams();
  return <RoomScreen id={id} />;
}
