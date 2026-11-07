import type { ReactNode } from "react";
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-[var(--radius-card)] border border-hairline bg-surface p-5 shadow-soft">
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      {children}
    </section>
  );
}
