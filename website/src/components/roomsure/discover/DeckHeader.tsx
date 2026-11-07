import { LayoutList, Layers, SlidersHorizontal } from "lucide-react";

export type DeckView = "cards" | "list";

interface Props {
  position: number;
  total: number;
  view: DeckView;
  onView: (v: DeckView) => void;
  onAdjust: () => void;
}

export function DeckHeader({ position, total, view, onView, onAdjust }: Props) {
  const tab = "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors duration-200";
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="tabular text-[14px] text-muted-foreground">
        {total > 0 && position <= total ? (
          <>
            <span className="font-semibold text-foreground">Card {position} of {total}</span> · ranked for you
          </>
        ) : (
          "All rooms seen"
        )}
      </p>
      <div className="flex items-center gap-1.5">
        <div className="flex rounded-full border border-hairline bg-surface p-0.5" role="group" aria-label="View">
          <button type="button" aria-pressed={view === "cards"} onClick={() => onView("cards")} className={`${tab} ${view === "cards" ? "bg-primary-soft text-primary" : "text-muted-foreground"}`}>
            <Layers className="size-4" /> Cards
          </button>
          <button type="button" aria-pressed={view === "list"} onClick={() => onView("list")} className={`${tab} ${view === "list" ? "bg-primary-soft text-primary" : "text-muted-foreground"}`}>
            <LayoutList className="size-4" /> List
          </button>
        </div>
        <button type="button" onClick={onAdjust} className="inline-flex h-10 min-w-[44px] items-center gap-1.5 rounded-full border border-hairline bg-surface px-3 text-[13px] font-semibold text-foreground">
          <SlidersHorizontal className="size-4" /> Adjust
        </button>
      </div>
    </div>
  );
}
