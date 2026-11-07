import { forwardRef } from "react";
import { actions, useRoomsure } from "@/lib/roomsure/state";
import { PreferencesPanel } from "./PreferencesPanel";

/** PreferencesPanel bound to app state: every change re-ranks the deck right away. */
export const LivePreferencesPanel = forwardRef<HTMLElement, { className?: string | undefined }>(function LivePreferencesPanel({ className }, ref) {
  const preferences = useRoomsure((s) => s.preferences);
  const destination = useRoomsure((s) => s.destination);
  return (
    <PreferencesPanel ref={ref} className={className} preferences={preferences} destination={destination}
      onPreferences={actions.setPreferences} onDestination={actions.setDestination} />
  );
});
