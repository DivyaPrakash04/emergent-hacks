import { FACTORS } from "@/lib/roomsure/rankListings";
import type { DeckCard } from "@/lib/roomsure/deck";
import { FACTOR_LABEL } from "./format";

/** Per-factor points, trust multiplier and total. Shared by the card back and the room page. */
export function MathBreakdown({ card }: { card: DeckCard }) {
  const active = FACTORS.filter((f) => card.weights[f] > 0);
  const verified = card.trustMultiplier === 1;
  return (
    <div>
      <ul className="space-y-3.5">
        {active.map((f) => (
          <li key={f}>
            <div className="flex items-baseline justify-between text-[14px]">
              <span className="font-semibold text-foreground">
                {FACTOR_LABEL[f]} <span className="tabular font-normal text-muted-foreground">· weight {Math.round(card.weights[f] * 100)}%</span>
              </span>
              <span className="tabular font-bold text-foreground">+{card.points[f].toFixed(1)}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${card.factorScores[f] ?? 0}%` }} />
              </div>
              <span className="tabular w-8 text-right text-[13px] text-muted-foreground">{Math.round(card.factorScores[f] ?? 0)}</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 space-y-1.5 border-t border-hairline pt-3 text-[14px]">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span className="tabular">{card.subtotal.toFixed(1)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>{verified ? "Trust · verified host or no preference" : "Trust · host not verified"}</span>
          <span className="tabular">× {card.trustMultiplier.toFixed(2)}</span>
        </div>
        <div className="flex items-baseline justify-between pt-1">
          <span className="font-display text-lg font-bold text-foreground">Score</span>
          <span className="tabular font-display text-2xl font-extrabold text-primary">{card.score}</span>
        </div>
      </div>

    </div>
  );
}
