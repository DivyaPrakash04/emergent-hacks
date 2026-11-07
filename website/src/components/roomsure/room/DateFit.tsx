import { shortDate } from "@/components/roomsure/discover/format";

const day = (iso: string) => Date.parse(iso + "T00:00:00Z") / 86400000;

/** Timeline: Maya's stay vs. the room's availability; uncovered days in amber. */
export function DateFit({ stay, room }: { stay: { start: string; end: string }; room: { from: string; to: string } }) {
  const s0 = day(stay.start), s1 = day(stay.end), r0 = day(room.from), r1 = day(room.to);
  const lo = Math.min(s0, r0), hi = Math.max(s1, r1), span = hi - lo || 1;
  const pct = (d: number) => ((d - lo) / span) * 100;
  const gapStart = Math.max(0, Math.min(r0, s1) - s0);
  const gapEnd = Math.max(0, s1 - Math.max(r1, s0));
  const gap = gapStart + gapEnd;

  const Bar = ({ a, b, cls }: { a: number; b: number; cls: string }) => (
    <div className={`absolute inset-y-0 rounded-full ${cls}`} style={{ left: `${pct(a)}%`, width: `${Math.max(pct(b) - pct(a), 0.8)}%` }} />
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex justify-between text-[13px]"><span className="font-semibold text-foreground">Your stay</span><span className="text-muted-foreground">{shortDate(stay.start)} – {shortDate(stay.end)}</span></div>
        <div className="relative h-3 rounded-full bg-muted">
          <Bar a={s0} b={s1} cls="bg-primary" />
          {gapStart > 0 && <Bar a={s0} b={s0 + gapStart} cls="bg-caution" />}
          {gapEnd > 0 && <Bar a={s1 - gapEnd} b={s1} cls="bg-caution" />}
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-[13px]"><span className="font-semibold text-foreground">Room available</span><span className="text-muted-foreground">{shortDate(room.from)} – {shortDate(room.to)}</span></div>
        <div className="relative h-3 rounded-full bg-muted"><Bar a={r0} b={r1} cls="bg-good/70" /></div>
      </div>
      {gap > 0 ? (
        <p className="inline-flex rounded-full bg-caution/12 px-3 py-1 text-[13px] font-semibold text-caution">{gap} {gap === 1 ? "day" : "days"} not covered</p>
      ) : (
        <p className="inline-flex rounded-full bg-good/10 px-3 py-1 text-[13px] font-semibold text-good">Covers every date</p>
      )}
    </div>
  );
}
