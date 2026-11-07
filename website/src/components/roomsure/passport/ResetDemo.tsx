import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { api } from "@/lib/roomsure/api";
import { actions } from "@/lib/roomsure/state";
import { Button } from "@/components/ui/button";

export function ResetDemo() {
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const reset = async () => {
    setBusy(true);
    actions.resetActivity();
    await api.resetDemo().catch(() => undefined);
    navigate({ to: "/discover" });
  };
  if (!confirm)
    return <Button variant="ghost" className="min-h-11 text-muted-foreground" onClick={() => setConfirm(true)}>Reset demo</Button>;
  return (
    <div role="alertdialog" aria-labelledby="reset-q" className="space-y-3 rounded-[var(--radius-card)] border border-hairline bg-surface p-4">
      <p id="reset-q" className="font-semibold text-foreground">Clear all swipes, matches and reservations?</p>
      <div className="flex gap-2">
        <Button variant="outline" className="min-h-11" onClick={() => setConfirm(false)} disabled={busy} autoFocus>Cancel</Button>
        <Button variant="destructive" className="min-h-11" onClick={reset} disabled={busy}>{busy ? "Resetting…" : "Yes, reset demo"}</Button>
      </div>
    </div>
  );
}
