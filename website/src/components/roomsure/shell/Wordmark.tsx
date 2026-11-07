import { Link } from "@tanstack/react-router";
import { House } from "lucide-react";

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="inline-flex items-center gap-2 rounded-[var(--radius-button)]" aria-label="Roomsure home">
      <span className="grid size-9 place-items-center rounded-[12px] bg-primary text-primary-foreground">
        <House className="size-5" strokeWidth={2.25} />
      </span>
      {!compact && (
        <span className="font-display text-xl font-extrabold tracking-tight text-foreground">
          room<span className="text-primary">sure</span>
        </span>
      )}
    </Link>
  );
}
