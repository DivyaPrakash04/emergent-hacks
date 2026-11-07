import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Heart, X } from "lucide-react";
import type { DeckCard } from "@/lib/roomsure/deck";
import { money } from "./format";

interface Props {
  cards: DeckCard[];
  onChoose: (id: string, dir: 1 | -1) => void;
}

export function DeckListView({ cards, onChoose }: Props) {
  return (
    <ul className="space-y-3">
      {cards.map((c) => (
        <motion.li layout key={c.listing.id} className="flex gap-3 rounded-[var(--radius-card)] bg-surface p-3 shadow-soft">
          <img src={c.listing.photos[0]} alt="" className="size-20 shrink-0 rounded-[16px] object-cover" loading="lazy" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <Link to="/room/$id" params={{ id: c.listing.id }} className="font-display text-[16px] font-bold leading-tight text-foreground hover:text-primary">
                {c.listing.title}
              </Link>
              <span className="tabular shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-[13px] font-bold text-primary">
                {c.score} · #{c.rank}
              </span>
            </div>
            <p className="tabular text-[13px] text-muted-foreground">{money(c.listing.pricePerMonth)}/mo · {c.listing.neighborhood}</p>
            <p className="mt-1 line-clamp-2 text-[14px] text-foreground">{c.sentence}</p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => onChoose(c.listing.id, -1)} className="inline-flex h-11 items-center gap-1 rounded-[var(--radius-button)] border border-hairline px-3 text-[13px] font-semibold text-muted-foreground">
                <X className="size-4" /> Pass
              </button>
              <button type="button" onClick={() => onChoose(c.listing.id, 1)} className="inline-flex h-11 items-center gap-1 rounded-[var(--radius-button)] bg-primary px-3 text-[13px] font-semibold text-primary-foreground">
                <Heart className="size-4" /> Interested
              </button>
            </div>
          </div>
        </motion.li>
      ))}
    </ul>
  );
}
