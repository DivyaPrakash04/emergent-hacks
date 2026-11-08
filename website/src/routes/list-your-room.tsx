import { createFileRoute } from "@tanstack/react-router";
import { HostScreen } from "@/components/roomsure/host/HostScreen";

export const Route = createFileRoute("/list-your-room")({
  head: () => ({
    meta: [
      { title: "List your room · Roomsure" },
      { name: "description", content: "Verified hosts with the right to rent can list a room: price, location, facilities, house rules, photos and a 3D tour." },
      { property: "og:title", content: "List your room · Roomsure" },
      { property: "og:description", content: "Verified hosts with the right to rent can list a room on Roomsure." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HostScreen,
});
