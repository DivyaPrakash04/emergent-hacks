import type { Severity } from "@/lib/roomsure/types";
import { SEVERITY_CHIP, SEVERITY_LABEL } from "./severity";

/** The warning signs the check looks for, in plain words. Same list and severities as the MVP requirements, section 5. */
const SIGNS: { name: string; example: string; severity: Severity }[] = [
  {
    name: "Money before a viewing",
    example: "Wire, gift card, crypto, a payment app, or a deposit before you've seen the room",
    severity: "high",
  },
  {
    name: "Can't show the room",
    example: "The owner is abroad, or the keys come by mail",
    severity: "medium",
  },
  {
    name: "Price far below fair",
    example: "Well under what similar rooms nearby cost",
    severity: "medium",
  },
  {
    name: "Pressure to hurry",
    example: '"Pay today", "many people are interested"',
    severity: "low",
  },
  {
    name: "Contact off the platform",
    example: 'A phone number, an email, or "text me"',
    severity: "low",
  },
];

/** Shown before the first check, so the empty page explains itself. */
export function WhatWeCheck() {
  return (
    <section
      aria-labelledby="what-we-check"
      className="space-y-4 rounded-[var(--radius-card)] border border-hairline bg-surface p-5 shadow-soft"
    >
      <h2 id="what-we-check" className="text-lg font-bold text-foreground">
        What we look for
      </h2>
      <ul className="space-y-3">
        {SIGNS.map((s) => (
          <li key={s.name} className="flex items-start gap-3">
            <span
              className={`mt-0.5 w-16 shrink-0 rounded-full px-2 py-0.5 text-center text-[12px] font-semibold ${SEVERITY_CHIP[s.severity]}`}
            >
              {SEVERITY_LABEL[s.severity]}
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{s.name}</p>
              <p className="text-[14px] text-muted-foreground">{s.example}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="border-t border-hairline pt-3 text-[13px] text-muted-foreground">
        We quote the exact words that raised each flag. Any high sign, or two medium ones, means
        High risk. We never call an outside listing safe: it stays "Outside · not verified by
        Roomsure".
      </p>
    </section>
  );
}
