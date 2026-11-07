import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Sparkles, WifiOff } from "lucide-react";
import { api } from "@/lib/roomsure/api";
import { OUTSIDE_EXAMPLES } from "@/lib/roomsure/data/outside-examples";
import type { CheckResult } from "@/lib/roomsure/types";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/roomsure/room/Section";
import { VerdictBanner } from "./VerdictBanner";
import { HighlightedText } from "./HighlightedText";
import { SignalList } from "./SignalList";
import { FactsTable } from "./FactsTable";
import { CheckPriceBar } from "./CheckPriceBar";

export function CheckScreen() {
  const [text, setText] = useState("");
  const [checked, setChecked] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  const reduce = useReducedMotion();

  async function run() {
    if (!text.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const r = await api.checkListing(text);
      setChecked(text); setResult(r);
    } catch {
      setError("We couldn't check that listing just now. Try again in a moment.");
    } finally { setLoading(false); }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 lg:py-10">
      <h1 className="text-3xl font-bold leading-tight text-foreground lg:text-4xl">Found a room somewhere else? Check it first.</h1>

      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-[var(--radius-card)]">
          <label htmlFor="listing-text" className="sr-only">Paste the listing text</label>
          <textarea id="listing-text" value={text} onChange={(e) => setText(e.target.value)} rows={7} readOnly={loading}
            placeholder="Paste the listing text here…"
            className="w-full resize-none rounded-[var(--radius-card)] border border-hairline bg-surface p-5 text-[16px] leading-relaxed text-foreground shadow-soft placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          {loading && (
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-primary/5">
              {!reduce && (
                <motion.div className="absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-primary/25 to-transparent"
                  initial={{ top: "-20%" }} animate={{ top: "100%" }} transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }} />
              )}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {OUTSIDE_EXAMPLES.map((ex) => (
            <button key={ex.id} type="button" onClick={() => { setText(ex.text); setResult(null); }}
              className="min-h-10 rounded-full border border-hairline bg-surface px-4 text-[14px] font-medium text-foreground hover:border-primary">
              {ex.label}
            </button>
          ))}
        </div>
        <Button variant="hero" size="xl" onClick={run} disabled={loading || !text.trim()}>
          {loading ? "Checking…" : "Check this listing"}
        </Button>
        {loading && <p role="status" className="text-[14px] text-muted-foreground">Scanning for warning signs…</p>}
        {error && <p role="alert" className="text-[14px] text-destructive">{error}</p>}
      </div>

      {result && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <VerdictBanner result={result} />
          {result.source === "claude" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[13px] font-semibold text-primary-foreground"><Sparkles className="size-3.5" /> Read by Claude · quotes checked by code</span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-[13px] font-semibold text-muted-foreground"><WifiOff className="size-3.5" /> Read by rules (offline)</span>
          )}
          <Section title="The listing"><HighlightedText text={checked} signals={result.signals} /></Section>
          <Section title="Warning signs"><SignalList signals={result.signals} /></Section>
          <Section title="What the listing says"><FactsTable facts={result.facts} /></Section>
          <Section title="Fair price"><CheckPriceBar fair={result.fairPrice} /></Section>
        </motion.div>
      )}
    </div>
  );
}
