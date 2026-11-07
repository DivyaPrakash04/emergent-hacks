import { motion } from "motion/react";

const COLORS = ["bg-primary", "bg-warm", "bg-primary-soft", "bg-warm-soft"];
const PIECES = Array.from({ length: 36 }, (_, i) => {
  const angle = (i / 36) * Math.PI * 2 + (i % 3) * 0.2;
  const dist = 180 + ((i * 53) % 140);
  return {
    x: Math.cos(angle) * dist,
    y: Math.sin(angle) * dist - 60,
    rotate: (i * 97) % 360,
    color: COLORS[i % COLORS.length],
    round: i % 4 === 0,
    delay: (i % 6) * 0.02,
  };
});

/** One short burst from the center in teal and gold. Caller skips it for reduced motion. */
export function Confetti() {
  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 top-[38%]">
      {PIECES.map((p, i) => (
        <motion.span
          key={i}
          className={`absolute block ${p.color} ${p.round ? "size-2.5 rounded-full" : "h-3 w-1.5 rounded-sm"}`}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 220], opacity: [1, 1, 0], rotate: p.rotate + 360, scale: 1 }}
          transition={{ duration: 1.6, delay: 0.35 + p.delay, ease: "easeOut", times: [0, 0.45, 1] }}
        />
      ))}
    </div>
  );
}
