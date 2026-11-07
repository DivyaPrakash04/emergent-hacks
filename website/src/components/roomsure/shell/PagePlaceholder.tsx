import type { ReactNode } from "react";

export function PagePlaceholder({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="text-3xl font-extrabold text-foreground sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-prose text-base text-muted-foreground">{description}</p>
      <div className="mt-8 rounded-[var(--radius-card)] border border-dashed border-hairline bg-surface p-8 text-[15px] text-muted-foreground">
        This screen is coming next.
        {action && <div className="mt-5">{action}</div>}
      </div>
    </section>
  );
}
