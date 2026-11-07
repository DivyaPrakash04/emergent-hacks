import { Calculator, Box, ShieldCheck } from "lucide-react";

const POINTS = [
  { icon: Calculator, label: "Every score explained" },
  { icon: Box, label: "Walk the room in 3D" },
  { icon: ShieldCheck, label: "Scam check before you pay" },
];

export function TrustPoints() {
  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {POINTS.map(({ icon: Icon, label }) => (
        <li key={label} className="flex items-center gap-3 text-[15px] font-medium text-foreground">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
            <Icon className="size-5" />
          </span>
          {label}
        </li>
      ))}
    </ul>
  );
}
