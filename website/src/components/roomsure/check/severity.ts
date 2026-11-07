import type { Severity } from "@/lib/roomsure/types";
export const SEVERITY_LABEL: Record<Severity, string> = { high: "High", medium: "Medium", low: "Low" };
export const SEVERITY_CHIP: Record<Severity, string> = {
  high: "bg-risk/10 text-risk",
  medium: "bg-caution/12 text-caution",
  low: "bg-muted text-muted-foreground",
};
