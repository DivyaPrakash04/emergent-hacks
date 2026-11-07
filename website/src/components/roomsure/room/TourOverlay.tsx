import { useEffect, useState } from "react";
import { Box, X } from "lucide-react";

/** Only absolute URLs are real scans; the demo's local paths show the placeholder. */
const isRealScan = (u?: string) => !!u && /^https?:\/\//.test(u);

export function TourOverlay({ open, onClose, scanUrl, title }: { open: boolean; onClose: () => void; scanUrl?: string | undefined; title: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open) return null;
  const showFrame = isRealScan(scanUrl) && !failed;

  return (
    <div role="dialog" aria-modal="true" aria-label={`3D tour of ${title}`} className="fixed inset-0 z-[60] flex flex-col bg-foreground">
      <div className="flex items-center justify-between p-3">
        <p className="font-semibold text-background">{title}</p>
        <button type="button" onClick={onClose} aria-label="Close 3D tour" autoFocus
          className="grid size-11 place-items-center rounded-full bg-background/15 text-background"><X className="size-5" /></button>
      </div>
      <div className="relative flex-1">
        {showFrame ? (
          <iframe src={scanUrl} title={`3D scan of ${title}`} onError={() => setFailed(true)} className="absolute inset-0 h-full w-full border-0" allow="fullscreen; xr-spatial-tracking" />
        ) : (
          <div className="absolute inset-0 grid place-items-center p-6 text-center text-background">
            <div className="space-y-3">
              <Box className="mx-auto size-12 opacity-70" />
              <p className="font-display text-2xl font-bold">3D tour loads here</p>
              <p className="text-background/70">The sample scan for this room isn't available yet.</p>
            </div>
          </div>
        )}
      </div>
      <p className="p-4 text-center text-[13px] text-background/75">
        Sample 3D scan · demo. A scan helps you inspect the room; it doesn't prove the listing is genuine.
      </p>
    </div>
  );
}
