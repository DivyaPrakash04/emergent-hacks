import type { ReactNode } from "react";

export function Field({ label, value, children, id }: { label: string; value?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span id={id} className="text-[14px] font-semibold text-foreground">{label}</span>
        {value != null && <span className="text-[14px] tabular-nums text-muted-foreground">{value}</span>}
      </div>
      {children}
    </div>
  );
}
