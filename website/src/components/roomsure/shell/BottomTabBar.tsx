import { Link } from "@tanstack/react-router";
import { NAV_ITEMS } from "./navItems";

export function BottomTabBar() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              className="flex min-h-[60px] flex-col items-center justify-center gap-1 text-[13px] font-medium text-muted-foreground transition-colors duration-200 ease-soft"
              activeProps={{ className: "text-primary" }}
            >
              <Icon className="size-[22px]" strokeWidth={2} />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
