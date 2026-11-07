import { motion, useReducedMotion } from "motion/react";
import room1 from "@/assets/welcome-room-1.jpg";
import room2 from "@/assets/welcome-room-2.jpg";
import room3 from "@/assets/welcome-room-3.jpg";

export function PhotoCollage() {
  const reduce = useReducedMotion();
  const enter = (delay: number) =>
    reduce
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3 } }
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <div className="relative mx-auto aspect-[5/4] w-full max-w-[560px]">
      <motion.img
        {...enter(0)}
        src={room1}
        width={896}
        height={1152}
        alt="Sunlit bedroom with a white linen bed and plants by a tall window"
        className="absolute left-[4%] top-0 h-[92%] w-[52%] rounded-[var(--radius-card)] object-cover shadow-soft"
      />
      <motion.img
        {...enter(0.08)}
        src={room2}
        width={896}
        height={896}
        loading="lazy"
        alt="Desk by a window at golden hour with a bookshelf"
        className="absolute right-[2%] top-[6%] w-[42%] rotate-2 rounded-[var(--radius-card)] border-4 border-surface object-cover shadow-soft"
      />
      <motion.img
        {...enter(0.16)}
        src={room3}
        width={896}
        height={896}
        loading="lazy"
        alt="Bright shared kitchen with open wooden shelves"
        className="absolute bottom-0 right-[10%] w-[40%] -rotate-3 rounded-[var(--radius-card)] border-4 border-surface object-cover shadow-soft"
      />
    </div>
  );
}
