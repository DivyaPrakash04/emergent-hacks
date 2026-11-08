import { useEffect } from "react";
import { X } from "lucide-react";

/** Walkable scans are served by this app under /scans/room3d/; they open in the walk overlay. */
export const isWalkableScan = (u: string | undefined): u is string => !!u && u.startsWith("/scans/room3d/");

/**
 * Full-screen walkable 3D tour (the viewer auto-enters WASD + mouse look).
 * Esc toggles the mouse inside the viewer, so the overlay deliberately does not
 * close on Esc; the Back pill at the top left is the one way out. Closing only
 * flips local state, so the screen underneath stays exactly as it was.
 */
export function WalkTourOverlay({ open, onClose, scanUrl, title }: { open: boolean; onClose: () => void; scanUrl: string; title: string }) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label={`Walkable 3D tour of ${title}`} className="fixed inset-0 z-[90] bg-foreground">
      <iframe
        src={scanUrl}
        title={`Walkable 3D scan of ${title}`}
        className="absolute inset-0 h-full w-full border-0"
        allow="pointer-lock; fullscreen"
      />
      <button
        type="button"
        onClick={onClose}
        aria-label="Exit 3D tour"
        autoFocus
        className="absolute left-3 top-[max(16px,env(safe-area-inset-top))] inline-flex h-11 items-center gap-1.5 rounded-full bg-surface/95 px-4 text-[14px] font-semibold text-foreground shadow-soft"
      >
        <X className="size-5" /> Back
      </button>
    </div>
  );
}
