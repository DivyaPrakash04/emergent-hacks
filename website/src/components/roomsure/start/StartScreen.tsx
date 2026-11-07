import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Sparkles, WifiOff } from "lucide-react";
import { api } from "@/lib/roomsure/api";
import { actions } from "@/lib/roomsure/state";
import type { DeckPreferences } from "@/lib/roomsure/deck";
import type { Destination, IntakeResult } from "@/lib/roomsure/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PreferencesPanel } from "@/components/roomsure/preferences/PreferencesPanel";

export const EXAMPLES = [
  "I'm interning downtown June 1 to August 15. Budget around $900, $1,050 max. Commute ideally 20 minutes, 35 at most. I need a kitchen, furnished matters a lot, and I can live with up to 5 days' gap.",
  "Starting at Brown for summer session, June 15 to August 10. Around $800, $950 max. A private bathroom would be nice.",
  "Moving for a 3-month job downtown, September 1 to November 30. Up to $1,200. Parking is a must.",
];
const CHIP = ["Summer intern downtown", "Brown summer session", "Fall job with parking"];

export function StartScreen() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IntakeResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [prefs, setPrefs] = useState<DeckPreferences | null>(null);
  const [dest, setDest] = useState<Destination>("work");

  async function run(input: string) {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const r = await api.parseIntake(input);
      setResult(r);
      setPrefs(r.preferences);
      setDest(r.destination);
    } catch {
      setError("We couldn't read that just now. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  function showRooms() {
    if (!prefs || !result) return;
    actions.setIntake(prefs, dest, result.source);
    navigate({ to: "/discover" });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8 lg:py-12">
      <section className="space-y-4">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-primary">Step 1</p>
        <h1 className="text-3xl font-bold text-foreground lg:text-4xl">What do you need?</h1>
        <label htmlFor="intake" className="sr-only">Describe your stay</label>
        <textarea
          id="intake"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="e.g. I'm interning downtown June 1 to August 15…"
          className="w-full resize-none rounded-[var(--radius-card)] border border-hairline bg-surface p-5 text-[17px] leading-relaxed text-foreground shadow-soft placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex, i) => (
            <button key={i} type="button" onClick={() => setText(ex)}
              className="min-h-10 rounded-full border border-hairline bg-surface px-4 text-[14px] font-medium text-foreground hover:border-primary">
              {CHIP[i]}
            </button>
          ))}
        </div>
        <Button variant="hero" size="xl" onClick={() => run(text)} disabled={loading || !text.trim()}>
          {loading ? "Reading your needs…" : "Find my rooms"}
        </Button>
        {error && <p role="alert" className="text-[14px] text-destructive">{error}</p>}
      </section>

      {loading && (
        <div aria-busy="true" aria-label="Reading your needs" className="space-y-4 rounded-[var(--radius-card)] border border-hairline bg-surface p-5">
          <p className="font-semibold text-primary">Reading your needs…</p>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-6 w-full" /></div>
          ))}
        </div>
      )}

      {!loading && result && prefs && (
        <section className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-primary">Step 2</p>
            {result.source === "claude" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[13px] font-semibold text-primary-foreground">
                <Sparkles className="size-3.5" /> Read by Claude
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-[13px] font-semibold text-muted-foreground">
                <WifiOff className="size-3.5" /> Read by rules (offline)
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-foreground">Here's what we heard</h2>

          {result.questions.map((q) => (
            <div key={q.id} className="space-y-3 rounded-2xl border border-warm/40 bg-warm/10 p-4">
              <p className="font-medium text-foreground">{q.text}</p>
              <div className="flex gap-2">
                <input aria-label={q.text} value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  className="h-11 flex-1 rounded-xl border border-hairline bg-surface px-3 text-[15px]" />
                <Button variant="soft" onClick={() => {
                  const next = `${text} ${answers[q.id] ?? ""}`.trim();
                  setText(next);
                  run(next);
                }}>Add</Button>
              </div>
            </div>
          ))}

          <PreferencesPanel title="Your preferences" preferences={prefs} destination={dest}
            onPreferences={setPrefs} onDestination={setDest}
            footer={<Button variant="hero" size="xl" className="w-full" onClick={showRooms}>Show my rooms</Button>} />
        </section>
      )}
    </div>
  );
}
