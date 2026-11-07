import { useState } from "react";
import type { CheckSignal } from "@/lib/roomsure/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SEVERITY_CHIP, SEVERITY_LABEL } from "./severity";

interface Span { start: number; end: number; signal: CheckSignal }

/** Highlights only the exact quotes returned by the check. */
export function HighlightedText({ text, signals }: { text: string; signals: CheckSignal[] }) {
  const spans: Span[] = [];
  for (const signal of signals)
    for (const q of signal.quotes) {
      let i = text.indexOf(q);
      while (q && i !== -1) { spans.push({ start: i, end: i + q.length, signal }); i = text.indexOf(q, i + q.length); }
    }
  spans.sort((a, b) => a.start - b.start || b.end - a.end);
  const clean: Span[] = [];
  for (const s of spans) if (!clean.length || s.start >= clean[clean.length - 1]!.end) clean.push(s);

  const parts: React.ReactNode[] = [];
  let at = 0;
  clean.forEach((s, n) => {
    if (s.start > at) parts.push(text.slice(at, s.start));
    parts.push(
      <Evidence key={n} quote={text.slice(s.start, s.end)} signal={s.signal} />,
    );
    at = s.end;
  });
  if (at < text.length) parts.push(text.slice(at));
  return <p className="whitespace-pre-wrap text-[16px] leading-relaxed text-foreground">{parts}</p>;
}

function Evidence({ quote, signal }: { quote: string; signal: CheckSignal }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <mark tabIndex={0} role="button" aria-label={`${quote}. ${signal.name}, ${SEVERITY_LABEL[signal.severity]} severity`}
          className="cursor-help rounded bg-evidence px-0.5 text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          onClick={(e) => { e.preventDefault(); setOpen(true); }}
          onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((o) => !o); } }}>
          {quote}
        </mark>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 text-[14px]" onOpenAutoFocus={(e) => e.preventDefault()}>
        <p className="font-semibold text-foreground">{signal.name}</p>
        <span className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[12px] font-semibold ${SEVERITY_CHIP[signal.severity]}`}>{SEVERITY_LABEL[signal.severity]}</span>
      </PopoverContent>
    </Popover>
  );
}
