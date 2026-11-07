import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { BadgeCheck, CreditCard, Mail, ScanFace } from "lucide-react";
import { actions, useRoomsure, type CheckKey } from "@/lib/roomsure/state";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/roomsure/matches/Avatar";

const ROWS: { key: CheckKey; label: string; icon: typeof Mail }[] = [
  { key: "email", label: "Email", icon: Mail },
  { key: "id", label: "ID and selfie", icon: ScanFace },
  { key: "card", label: "Card", icon: CreditCard },
];

export function PassportCard() {
  const checks = useRoomsure((s) => s.checks);
  const [scanning, setScanning] = useState<CheckKey | null>(null);
  const reduce = useReducedMotion();

  const run = (key: CheckKey) => {
    setScanning(key);
    setTimeout(() => { actions.completeCheck(key); setScanning(null); }, 1600);
  };

  return (
    <div className="relative overflow-hidden rounded-[28px] bg-primary p-6 text-primary-foreground shadow-soft">
      <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.12]">
        <defs>
          <pattern id="pp" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
            <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#pp)" />
      </svg>
      <div className="relative space-y-5">
        <div className="flex items-start justify-between">
          <p className="font-display text-sm font-bold uppercase tracking-[0.18em] opacity-85">Roomsure Passport</p>
          <span className="rounded-full bg-surface/20 px-2.5 py-0.5 text-[12px] font-semibold">Simulated</span>
        </div>
        <div className="flex items-center gap-4">
          <Avatar name="Maya Chen" className="size-16 border-2 border-surface/60 bg-surface text-2xl" />
          <div>
            <p className="font-display text-2xl font-bold">Maya Chen</p>
            <p className="text-[14px] opacity-85">Seeker · Member since Nov 2026</p>
          </div>
        </div>
        <ul className="space-y-2">
          {ROWS.map(({ key, label, icon: I }) => {
            const done = checks[key];
            return (
              <li key={key} className="relative flex min-h-14 items-center gap-3 overflow-hidden rounded-2xl bg-surface/12 px-3 py-2">
                <I className="size-5 shrink-0 opacity-90" />
                <div className="flex-1">
                  <p className="font-semibold">{label}</p>
                  <p className="text-[12px] opacity-80">{done ? "Verified" : scanning === key ? "Checking…" : "Not checked yet"} · Simulated</p>
                </div>
                {done ? (
                  <BadgeCheck className="size-6 text-warm" aria-label="Verified" />
                ) : (
                  <Button size="sm" disabled={scanning !== null} onClick={() => run(key)}
                    className="min-h-11 bg-surface text-primary hover:bg-surface/90">Run simulated check</Button>
                )}
                {scanning === key && !reduce && (
                  <motion.span aria-hidden className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-surface/40 to-transparent"
                    initial={{ left: "-35%" }} animate={{ left: "100%" }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
