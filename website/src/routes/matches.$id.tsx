import { createFileRoute } from "@tanstack/react-router";
import { ChatScreen } from "@/components/roomsure/chat/ChatScreen";
import { listingsQuery } from "@/lib/roomsure/queries";
import { DiscoverError, DiscoverPending } from "@/components/roomsure/discover/DiscoverStates";

export const Route = createFileRoute("/matches/$id")({
  head: () => ({
    meta: [
      { title: "Chat with the host · Roomsure" },
      { name: "description", content: "Talk with the host, then reserve your first month. Chat demo · no real messages." },
      { property: "og:title", content: "Chat with the host · Roomsure" },
      { property: "og:description", content: "Talk with the host, then reserve your first month. Chat demo · no real messages." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(listingsQuery),
  pendingComponent: DiscoverPending,
  errorComponent: DiscoverError,
  component: ChatPage,
});

function ChatPage() {
  const { id } = Route.useParams();
  return <ChatScreen id={id} />;
}
