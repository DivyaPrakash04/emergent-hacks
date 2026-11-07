import { createFileRoute } from "@tanstack/react-router";
import { CheckScreen } from "@/components/roomsure/check/CheckScreen";

export const Route = createFileRoute("/check")({
  head: () => ({
    meta: [
      { title: "Scam check · Roomsure" },
      { name: "description", content: "Paste a listing you found elsewhere and see its red flags before you pay." },
      { property: "og:title", content: "Scam check · Roomsure" },
      { property: "og:description", content: "Paste a listing you found elsewhere and see its red flags before you pay." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CheckScreen,
});
