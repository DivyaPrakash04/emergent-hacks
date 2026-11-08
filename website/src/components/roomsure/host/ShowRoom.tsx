import { useRef, useState } from "react";
import { Box, ImagePlus, X } from "lucide-react";
import { hostActions, useHost } from "@/lib/roomsure/host";
import { Button } from "@/components/ui/button";
import { shrinkPhoto } from "./photos";

const MAX_PHOTOS = 3;

export function ShowRoom() {
  const photos = useHost((s) => s.draft.photos);
  const withTour = useHost((s) => s.draft.withTour);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    setBusy(true);
    try {
      const room = MAX_PHOTOS - photos.length;
      const picked = [...files].slice(0, room);
      const shrunk = await Promise.all(picked.map((f) => shrinkPhoto(f)));
      const saved = hostActions.updateDraft({ photos: [...photos, ...shrunk].slice(0, MAX_PHOTOS) });
      if (!saved) setError("This browser's storage is full. Remove a photo or a published room and try again.");
      else if (files.length > room) setError(`You can add up to ${MAX_PHOTOS} photos; the first ${room} were added.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That photo couldn't be added.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <p className="text-[14px] font-semibold text-foreground">Photos ({photos.length} of {MAX_PHOTOS})</p>
        <ul className="grid grid-cols-3 gap-3">
          {photos.map((src, i) => (
            <li key={i} className="relative aspect-square overflow-hidden rounded-2xl border border-hairline">
              <img src={src} alt={`Room photo ${i + 1}`} className="h-full w-full object-cover" />
              <button type="button" aria-label={`Remove photo ${i + 1}`}
                onClick={() => hostActions.updateDraft({ photos: photos.filter((_, j) => j !== i) })}
                className="absolute right-1.5 top-1.5 flex size-8 items-center justify-center rounded-full bg-surface/95 text-foreground shadow-soft hover:text-risk">
                <X className="size-4" />
              </button>
            </li>
          ))}
          {photos.length < MAX_PHOTOS && (
            <li>
              <label htmlFor="room-photos"
                className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-hairline bg-background text-[13px] font-medium text-muted-foreground hover:border-primary hover:text-primary">
                <ImagePlus className="size-6" />
                {busy ? "Adding…" : "Add photos"}
              </label>
              <input id="room-photos" ref={fileRef} type="file" accept="image/*" multiple className="sr-only"
                onChange={(e) => add(e.target.files)} />
            </li>
          )}
        </ul>
        {error && <p role="alert" className="text-[14px] text-destructive">{error}</p>}
        <p className="text-[13px] text-muted-foreground">Bright, current photos of this exact room. No people in the shot.</p>
      </div>

      <div className="space-y-3 rounded-2xl border border-hairline p-4">
        <label htmlFor="room-tour" className="flex cursor-pointer items-start gap-3">
          <input id="room-tour" type="checkbox" className="mt-1 size-4 accent-[var(--color-primary)]" checked={withTour}
            onChange={(e) => hostActions.updateDraft({ withTour: e.target.checked })} />
          <span>
            <span className="flex items-center gap-1.5 font-semibold text-foreground"><Box className="size-4 text-primary" /> Add a 3D tour</span>
            <span className="block text-[13px] text-muted-foreground">
              Seekers can walk through the room before they ask to visit. In this demo, the tour uses the team's sample 3D room.
            </span>
          </span>
        </label>
        <Button asChild variant="soft" className="min-h-11">
          <a href="/host/index.html" target="_blank" rel="noopener">Make a tour from your own phone video</a>
        </Button>
      </div>
    </div>
  );
}
