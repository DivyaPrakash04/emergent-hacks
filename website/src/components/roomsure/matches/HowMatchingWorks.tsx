import { Link } from "@tanstack/react-router";
import { Heart, KeyRound, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    icon: Heart,
    title: "Swipe right on rooms you like",
    note: "Each card says why it ranked where it did.",
  },
  {
    icon: MessageCircle,
    title: "The host replies",
    note: "When they say yes, it's a match and chat opens. Simulated in this demo.",
  },
  {
    icon: KeyRound,
    title: "Reserve the first month",
    note: "Paid through Roomsure, never by wire. Simulated in this demo.",
  },
];

/** Empty Matches tab: shows how a match happens instead of a blank box. */
export function HowMatchingWorks() {
  return (
    <div className="space-y-5 rounded-[var(--radius-card)] border border-dashed border-hairline bg-surface p-6">
      <div className="text-center">
        <p className="text-lg font-bold text-foreground">No matches yet</p>
        <p className="text-[14px] text-muted-foreground">
          When a host accepts, the room shows up here.
        </p>
      </div>
      <ol className="space-y-3">
        {STEPS.map(({ icon: I, title, note }, i) => (
          <li key={title} className="flex items-start gap-3">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"
              aria-hidden
            >
              <I className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-foreground">
                <span className="sr-only">Step {i + 1}: </span>
                {title}
              </p>
              <p className="text-[14px] text-muted-foreground">{note}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="text-center">
        <Button asChild variant="hero">
          <Link to="/discover">Start swiping</Link>
        </Button>
      </div>
    </div>
  );
}
