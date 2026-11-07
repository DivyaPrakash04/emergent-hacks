import { cn } from "@/lib/utils";
export function Avatar({ name, className }: { name: string; className?: string | undefined }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span aria-hidden className={cn("grid place-items-center rounded-full bg-primary-soft font-display font-bold text-primary", className)}>
      {initials}
    </span>
  );
}
