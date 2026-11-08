import { Box, ImagePlus } from "lucide-react";
import { facilityText } from "@/lib/roomsure/defaults";
import { placeholderPhoto, type HostDraft } from "@/lib/roomsure/host";
import { money, shortDate } from "@/components/roomsure/discover/format";

/**
 * The host's room as a card, before it can be ranked. It mirrors the seeker card's look
 * but shows no score: scores only ever come from the ranking code.
 */
export function DraftCard({ draft, dimmed = false }: { draft: HostDraft; dimmed?: boolean }) {
  const title = draft.title.trim();
  const photo =
    draft.photos[0] ??
    (draft.withTour && draft.neighborhood ? placeholderPhoto(draft.neighborhood) : null);
  const dates =
    draft.availableFrom && draft.availableTo
      ? `Free ${shortDate(draft.availableFrom)} – ${shortDate(draft.availableTo)}`
      : "Dates not set";

  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-soft transition-opacity ${dimmed ? "opacity-75" : ""}`}
    >
      <div className="relative h-[58%] shrink-0">
        {photo ? (
          <img src={photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary-soft to-muted text-primary">
            <ImagePlus className="size-8" />
            <span className="text-[14px] font-semibold">Your photo shows here</span>
          </div>
        )}
        {draft.withTour && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-surface/95 px-2.5 py-1 text-[13px] font-semibold text-foreground">
            <Box className="size-3.5 text-primary" /> 3D tour
          </span>
        )}
        <span className="absolute right-3 top-3 rounded-full bg-surface/95 px-2.5 py-1 text-[12px] font-semibold text-muted-foreground">
          Not ranked yet
        </span>
        <div className="photo-fade pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-3 pt-16 text-primary-foreground">
          <p className={`text-[22px] font-bold leading-tight ${title ? "" : "opacity-75"}`}>
            {title || "Your room title"}
          </p>
          <p className="tabular mt-1 text-[14px] font-medium opacity-95">
            {draft.neighborhood || "Neighborhood"} ·{" "}
            <span className="font-bold">{draft.price ? `${money(draft.price)}/mo` : "$—/mo"}</span>
          </p>
          <p className="tabular text-[13px] opacity-90">{dates}</p>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        {draft.facilities.length ? (
          <ul className="flex flex-wrap gap-1.5" aria-label="Facilities">
            {draft.facilities.map((k) => (
              <li
                key={k}
                className="rounded-full bg-primary-soft px-2.5 py-1 text-[13px] font-medium text-primary"
              >
                {facilityText(k).label}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-muted-foreground">The facilities you tick show here.</p>
        )}
      </div>
    </div>
  );
}
