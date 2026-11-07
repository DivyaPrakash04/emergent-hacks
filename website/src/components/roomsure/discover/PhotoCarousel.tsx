import { useState } from "react";

export function PhotoCarousel({ photos, alt, interactive }: { photos: string[]; alt: string; interactive: boolean }) {
  const [i, setI] = useState(0);
  const go = (d: number) => setI((v) => (v + d + photos.length) % photos.length);

  return (
    <div className="absolute inset-0">
      <img src={photos[i]} alt={`${alt}, photo ${i + 1} of ${photos.length}`} draggable={false} className="h-full w-full select-none object-cover" />
      {photos.length > 1 && (
        <>
          <div className="absolute inset-x-3 top-3 flex gap-1.5" aria-hidden>
            {photos.map((_, n) => (
              <span key={n} className={`h-1 flex-1 rounded-full ${n === i ? "bg-surface" : "bg-surface/45"}`} />
            ))}
          </div>
          {interactive && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={(e) => { e.stopPropagation(); go(-1); }}
                className="absolute inset-y-0 left-0 w-1/4"
              />
              <button
                type="button"
                aria-label="Next photo"
                onClick={(e) => { e.stopPropagation(); go(1); }}
                className="absolute inset-y-0 right-0 w-1/4"
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
