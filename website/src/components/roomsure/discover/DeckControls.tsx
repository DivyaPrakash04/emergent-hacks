import { cn } from "@/lib/utils";
import { Heart, Info, RotateCcw, X } from "lucide-react";

interface Props {
  onUndo: () => void;
  onPass: () => void;
  onDetails: () => void;
  onInterested: () => void;
  canUndo: boolean;
  disabled: boolean;
}

const round =
  "grid place-items-center rounded-full border shadow-soft transition-transform duration-200 ease-soft hover:-translate-y-0.5 active:scale-95 disabled:opacity-40 disabled:hover:translate-y-0";

export function DeckControls({ onUndo, onPass, onDetails, onInterested, canUndo, disabled }: Props) {
  return (
    <div className="flex items-center justify-center gap-4">
      <button type="button" aria-label="Undo (Z)" onClick={onUndo} disabled={!canUndo} className={cn(round, "size-12 border-hairline bg-surface text-muted-foreground")}>
        <RotateCcw className="size-5" />
      </button>
      <button type="button" aria-label="Pass (left arrow)" onClick={onPass} disabled={disabled} className={cn(round, "size-16 border-hairline bg-surface text-muted-foreground")}>
        <X className="size-7" strokeWidth={2.5} />
      </button>
      <button type="button" aria-label="Details (up arrow)" onClick={onDetails} disabled={disabled} className={cn(round, "size-12 border-hairline bg-surface text-foreground")}>
        <Info className="size-5" />
      </button>
      <button
        type="button"
        aria-label="Interested (right arrow)"
        onClick={onInterested}
        disabled={disabled}
        className={cn(round, "size-20 border-primary bg-primary text-primary-foreground")}
      >
        <Heart className="size-8" strokeWidth={2.5} />
      </button>
    </div>
  );
}
