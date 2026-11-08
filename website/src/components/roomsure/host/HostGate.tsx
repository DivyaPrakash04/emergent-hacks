import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { BadgeCheck, CreditCard, KeyRound, Mail, ScanFace, ShieldCheck } from "lucide-react";
import { hostActions, RIGHT_TO_RENT, useHost, type HostCheck } from "@/lib/roomsure/host";
import { Button } from "@/components/ui/button";

const CHECKS: { key: HostCheck; label: string; help: string; icon: typeof Mail }[] = [
  { key: "email", label: "Email", help: "Confirms we can reach you.", icon: Mail },
  { key: "id", label: "ID and selfie", help: "Confirms you are who you say you are.", icon: ScanFace },
  { key: "card", label: "Card on file", help: "Makes fake accounts costly. Never charged in this demo.", icon: CreditCard },
];

export const HONEST_LISTING_RULES = [
  "I'll never ask for money before a seeker has seen the room.",
  "I'll keep messages and payments on Roomsure.",
  "My photos and 3D tour show this room as it is today.",
  "I won't turn anyone away because of race, religion, gender, disability, nationality or family status.",
];

const inputClass = "h-11 w-full rounded-xl border border-hairline bg-background px-3 text-[15px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function SignIn() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const create = () => {
    if (name.trim().length < 2) return setError("Enter your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Enter a valid email address.");
    setError(null);
    hostActions.signIn(name, email);
  };
  return (
    <div className="space-y-4">
      <Button variant="hero" size="xl" className="w-full" onClick={() => hostActions.signInDemo()}>
        <KeyRound className="size-5" /> Continue as Lena (demo host)
      </Button>
      <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
        <span className="h-px flex-1 bg-hairline" /> or create a host account <span className="h-px flex-1 bg-hairline" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-[14px] font-medium text-foreground" htmlFor="host-name">
          Your name
          <input id="host-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </label>
        <label className="space-y-1 text-[14px] font-medium text-foreground" htmlFor="host-email">
          Email
          <input id="host-email" type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
      </div>
      {error && <p role="alert" className="text-[14px] text-destructive">{error}</p>}
      <Button variant="soft" className="min-h-11 w-full" onClick={create}>Create host account</Button>
      <p className="text-[13px] text-muted-foreground">Demo: accounts are simulated and stay in this browser. No password needed yet.</p>
    </div>
  );
}

function Checks() {
  const checks = useHost((s) => s.checks);
  const [running, setRunning] = useState<HostCheck | null>(null);
  const reduce = useReducedMotion();
  const run = (key: HostCheck) => {
    setRunning(key);
    setTimeout(() => { hostActions.completeCheck(key); setRunning(null); }, 1200);
  };
  return (
    <ul className="space-y-2">
      {CHECKS.map(({ key, label, help, icon: I }) => {
        const done = checks[key];
        return (
          <li key={key} className="relative flex min-h-14 items-center gap-3 overflow-hidden rounded-2xl border border-hairline px-3 py-2">
            <I className="size-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">{label}</p>
              <p className="text-[12px] text-muted-foreground">{done ? "Verified" : running === key ? "Checking…" : help} · Simulated</p>
            </div>
            {done ? (
              <BadgeCheck className="size-6 text-good" aria-label={`${label} verified`} />
            ) : (
              <Button size="sm" variant="soft" className="min-h-11" disabled={running !== null} onClick={() => run(key)}>
                Run simulated check
              </Button>
            )}
            {running === key && !reduce && (
              <motion.span aria-hidden className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-primary-soft to-transparent"
                initial={{ left: "-35%" }} animate={{ left: "100%" }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function RightToRent() {
  const value = useHost((s) => s.rightToRent);
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 font-semibold text-foreground">Your right to rent this room</legend>
      {RIGHT_TO_RENT.map((o) => (
        <label key={o.value} htmlFor={`rtr-${o.value}`}
          className={`flex cursor-pointer gap-3 rounded-2xl border p-3 transition-colors ${value === o.value ? "border-primary bg-primary-soft" : "border-hairline hover:border-primary/60"}`}>
          <input id={`rtr-${o.value}`} type="radio" name="right-to-rent" value={o.value} aria-label={o.label} className="mt-1 size-4 accent-[var(--color-primary)]"
            checked={value === o.value} onChange={() => hostActions.setRightToRent(o.value)} />
          <span>
            <span className="block font-medium text-foreground">{o.label}</span>
            <span className="block text-[13px] text-muted-foreground">{o.help}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function Rules() {
  const accepted = useHost((s) => s.rulesAccepted);
  return (
    <div className="space-y-3 rounded-2xl bg-primary-soft/60 p-4">
      <p className="flex items-center gap-2 font-semibold text-foreground"><ShieldCheck className="size-5 text-primary" /> Honest-listing rules</p>
      <ul className="list-disc space-y-1 pl-5 text-[14px] text-foreground">
        {HONEST_LISTING_RULES.map((r) => <li key={r}>{r}</li>)}
      </ul>
      <label htmlFor="host-rules" className="flex cursor-pointer items-center gap-2 text-[15px] font-medium text-foreground">
        <input id="host-rules" type="checkbox" className="size-4 accent-[var(--color-primary)]" checked={accepted}
          onChange={(e) => hostActions.setRulesAccepted(e.target.checked)} />
        I agree to these rules
      </label>
      <p className="text-[12px] text-muted-foreground">Listings that break them are removed, and the host is suspended.</p>
    </div>
  );
}

export function HostGate() {
  const profile = useHost((s) => s.profile);
  if (!profile) return <SignIn />;
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted px-4 py-3">
        <p className="text-[15px] text-foreground">
          Signed in as <span className="font-semibold">{profile.name}</span>{profile.demo ? " (demo host)" : ""}
        </p>
        <Button variant="ghost" size="sm" onClick={() => hostActions.signOut()}>Sign out</Button>
      </div>
      <Checks />
      <RightToRent />
      <Rules />
    </div>
  );
}
