import { Link } from "@tanstack/react-router";
import { NAV_ITEMS } from "./navItems";
import { Wordmark } from "./Wordmark";

export function NavRail() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-y-0 left-0 z-40 hidden w-24 flex-col items-center gap-8 border-r border-hairline bg-surface py-5 lg:flex"
    >
      <Wordmark compact />
      <ul className="flex flex-col gap-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              className="flex w-20 flex-col items-center gap-1 rounded-[var(--radius-button)] py-2.5 text-[13px] font-medium text-muted-foreground transition-colors duration-200 ease-soft hover:bg-muted"
              activeProps={{ className: "bg-primary-soft text-primary" }}
            >
              <Icon className="size-[22px]" strokeWidth={2} />
              {label}
            </Link>
          </li>
        ))}
      </ul>
      <span className="mt-auto font-display text-[13px] font-extrabold text-foreground">
        room<span className="text-primary">sure</span>
      </span>
    </nav>
  );
}
