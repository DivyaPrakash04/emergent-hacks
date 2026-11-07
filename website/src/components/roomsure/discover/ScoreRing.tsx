export function ScoreRing({ score, rank, size = 64 }: { score: number; rank: number; size?: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="relative grid place-items-center rounded-full bg-surface/95 shadow-soft"
        style={{ width: size, height: size }}
        role="img"
        aria-label={`Score ${score} out of 100, ranked number ${rank}`}
      >
        <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" strokeWidth="5" className="stroke-hairline" />
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            strokeWidth="5"
            strokeLinecap="round"
            className="stroke-primary transition-[stroke-dashoffset] duration-500 ease-soft"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - score / 100)}
          />
        </svg>
        <span className="tabular font-display text-xl font-extrabold text-foreground">{score}</span>
      </div>
      <span className="tabular rounded-full bg-warm px-2 py-0.5 text-[13px] font-bold text-foreground">#{rank}</span>
    </div>
  );
}
