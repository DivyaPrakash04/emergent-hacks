import { createFileRoute } from "@tanstack/react-router";
import { WelcomeHero } from "@/components/roomsure/welcome/WelcomeHero";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Roomsure · A room you can trust, for 1 to 6 months" },
      { name: "description", content: "Find a room for 1 to 6 months, see why it ranked, walk it in 3D, and check for scams before you pay." },
      { property: "og:title", content: "Roomsure · A room you can trust, for 1 to 6 months" },
      { property: "og:description", content: "Rooms ranked by your trade-offs, every score explained, scam check before you pay." },
    ],
  }),
  component: WelcomeHero,
});
