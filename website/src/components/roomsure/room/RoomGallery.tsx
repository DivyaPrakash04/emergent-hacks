import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Box, ChevronLeft, ChevronRight } from "lucide-react";

export function RoomGallery({ photos, alt, hasScan, onTour }: { photos: string[]; alt: string; hasScan: boolean; onTour: () => void }) {
  const [i, setI] = useState(0);
  const startX = useRef<number | null>(null);
  const go = (d: number) => setI((v) => (v + d + photos.length) % photos.length);

  return (
    <div
      className="relative aspect-[4/3] w-full overflow-hidden bg-muted lg:rounded-[var(--radius-card)]"
      onPointerDown={(e) => (startX.current = e.clientX)}
      onPointerUp={(e) => {
        if (startX.current == null) return;
        const dx = e.clientX - startX.current;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        startX.current = null;
      }}
      style={{ touchAction: "pan-y" }}
    >
      <img src={photos[i]} alt={`${alt}, photo ${i + 1} of ${photos.length}`} draggable={false} className="h-full w-full select-none object-cover" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-foreground/40 to-transparent" />
      <Link to="/discover" aria-label="Back to Discover"
        className="absolute left-3 top-4 grid size-11 place-items-center rounded-full bg-surface/90 text-foreground shadow-soft">
        <ArrowLeft className="size-5" />
      </Link>
      {hasScan && (
        <button type="button" onClick={onTour}
          className="absolute right-3 top-4 inline-flex h-9 items-center gap-1.5 rounded-full bg-surface/90 px-3 text-[13px] font-semibold text-foreground shadow-soft">
          <Box className="size-4" /> 3D tour
        </button>
      )}
      {photos.length > 1 && (
        <>
          <button type="button" aria-label="Previous photo" onClick={() => go(-1)}
            className="absolute left-3 top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-surface/85 sm:grid"><ChevronLeft className="size-5" /></button>
          <button type="button" aria-label="Next photo" onClick={() => go(1)}
            className="absolute right-3 top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-surface/85 sm:grid"><ChevronRight className="size-5" /></button>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {photos.map((_, n) => (
              <button key={n} type="button" aria-label={`Show photo ${n + 1}`} aria-current={n === i}
                onClick={() => setI(n)} className="grid size-6 place-items-center">
                <span className={`block h-2 rounded-full transition-all ${n === i ? "w-5 bg-surface" : "w-2 bg-surface/55"}`} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
