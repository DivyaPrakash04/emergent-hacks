import { Compass, Heart, ShieldCheck, IdCard, type LucideIcon } from "lucide-react";

export type NavItem = {
  to: "/discover" | "/matches" | "/check" | "/passport";
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/matches", label: "Matches", icon: Heart },
  { to: "/check", label: "Check", icon: ShieldCheck },
  { to: "/passport", label: "Passport", icon: IdCard },
];

/** Routes where the tab bar / nav rail stays hidden. */
export const SHELL_HIDDEN_PATHS = ["/", "/start"];
