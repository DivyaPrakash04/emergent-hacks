import type { ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { AppHeader } from "./AppHeader";
import { BottomTabBar } from "./BottomTabBar";
import { NavRail } from "./NavRail";
import { SHELL_HIDDEN_PATHS } from "./navItems";

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const showNav = !SHELL_HIDDEN_PATHS.includes(pathname);
  const reduce = useReducedMotion();

  // overflow-x-clip, not -hidden: "hidden" turns this div into a scroll box, which breaks every sticky panel inside.
  return (
    <div className="min-h-screen overflow-x-clip">
      {showNav && <NavRail />}
      <div className={showNav ? "pb-20 lg:pb-0 lg:pl-24" : undefined}>
        <AppHeader hideWordmarkOnDesktop={showNav} />
        <main>
          <motion.div
            key={pathname}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </main>
      </div>
      {showNav && <BottomTabBar />}
    </div>
  );
}
