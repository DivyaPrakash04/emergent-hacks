import type { ReactNode } from "react";
import { CheckCircle2, Lock } from "lucide-react";
import { hostGate, isVerifiedHost, useHost, validateDraft } from "@/lib/roomsure/host";
import { HostGate } from "./HostGate";
import { RoomForm } from "./RoomForm";
import { ShowRoom } from "./ShowRoom";
import { PublishPanel } from "./PublishPanel";
import { PublishedRooms } from "./PublishedRooms";

function Step({ n, title, done, note, children }: { n: number; title: string; done: boolean; note?: string | undefined; children: ReactNode }) {
  return (
    <section aria-labelledby={`host-step-${n}`} className="space-y-4 rounded-[var(--radius-card)] border border-hairline bg-surface p-5 shadow-soft sm:p-6">
      <div className="flex items-start gap-3">
        <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[15px] font-bold ${done ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary"}`}>
          {done ? <CheckCircle2 className="size-5" aria-label="Done" /> : n}
        </span>
        <div className="min-w-0">
          <h2 id={`host-step-${n}`} className="text-xl font-bold text-foreground">{title}</h2>
          {note && <p className="mt-0.5 text-[14px] text-muted-foreground">{note}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export function HostScreen() {
  const s = useHost((x) => x);
  const verified = isVerifiedHost(s);
  const gateDone = hostGate(s).filter((g) => g.done).length;
  const issues = validateDraft(s.draft);
  const detailsDone = !issues.some((i) => i.field !== "photos");
  const showDone = !issues.some((i) => i.field === "photos");

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 lg:py-10">
      <header className="space-y-2">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-primary">List your room</p>
        <h1 className="text-3xl font-bold leading-tight text-foreground">Rent out a room people can trust</h1>
        <p className="max-w-prose text-[15px] text-muted-foreground">
          Only verified hosts with the right to rent can publish. In this demo, checks are simulated and your listing stays in this browser.
        </p>
      </header>

      <Step n={1} title="Prove you're a real host" done={verified} note={verified ? "You're verified." : `${gateDone} of 4 done. Publishing stays locked until all four are done.`}>
        <HostGate />
      </Step>
      <Step n={2} title="Describe the room" done={detailsDone} note="Price, location, dates, facilities and house rules.">
        <RoomForm />
      </Step>
      <Step n={3} title="Show the room" done={showDone} note="At least one photo or a 3D tour.">
        <ShowRoom />
      </Step>
      <Step n={4} title="Preview and publish" done={false} note={verified ? "See your room the way seekers will." : undefined}>
        {!verified && (
          <p className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-[14px] text-muted-foreground">
            <Lock className="size-4 shrink-0" /> Finish step 1 to unlock publishing. You can fill in the room details meanwhile.
          </p>
        )}
        <PublishPanel />
      </Step>
      <PublishedRooms />
    </div>
  );
}
