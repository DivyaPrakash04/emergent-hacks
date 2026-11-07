import { createFileRoute } from "@tanstack/react-router";
import { StartScreen } from "@/components/roomsure/start/StartScreen";

export const Route = createFileRoute("/start")({
  head: () => ({
    meta: [
      { title: "Tell us what you need · Roomsure" },
      { name: "description", content: "Describe your stay in a sentence, then review the preferences we pulled from it." },
      { property: "og:title", content: "Tell us what you need · Roomsure" },
      { property: "og:description", content: "Describe your stay in a sentence, then review the preferences we pulled from it." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StartScreen,
});
