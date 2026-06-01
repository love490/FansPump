import type { LucideIcon } from "lucide-react";
import {
  Home,
  Rocket,
  Compass,
  Star,
  HelpCircle,
  BookOpen,
  LayoutDashboard,
  Coins,
  Bookmark,
  Users,
  ArrowLeftRight,
  Settings,
} from "lucide-react";

export type SidebarNavId =
  | "home"
  | "create"
  | "explore"
  | "featured"
  | "how-it-works"
  | "docs"
  | "swap"
  | "dashboard"
  | "my-tokens"
  | "watchlist"
  | "following"
  | "settings";

export type SidebarNavItem = {
  id: SidebarNavId;
  href: string;
  label: string;
  icon: LucideIcon;
};

export const platformLinks: SidebarNavItem[] = [
  { id: "home", href: "/", label: "Home", icon: Home },
  { id: "create", href: "/create", label: "Create Token", icon: Rocket },
  { id: "explore", href: "/discover?section=new", label: "Explore", icon: Compass },
  { id: "featured", href: "/discover?section=featured", label: "Featured", icon: Star },
  { id: "how-it-works", href: "/docs/how-it-works", label: "How It Works", icon: HelpCircle },
  { id: "docs", href: "/docs", label: "Docs", icon: BookOpen },
  { id: "swap", href: "/swap", label: "Swap", icon: ArrowLeftRight },
];

export const userLinks: SidebarNavItem[] = [
  { id: "dashboard", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "my-tokens", href: "/my-tokens", label: "My Tokens", icon: Coins },
  { id: "watchlist", href: "/watchlist", label: "Watchlist", icon: Bookmark },
  { id: "following", href: "/following", label: "Following", icon: Users },
];

export const settingsLink: SidebarNavItem = {
  id: "settings",
  href: "/settings",
  label: "Settings",
  icon: Settings,
};

export function isSidebarNavActive(
  id: SidebarNavId,
  pathname: string,
  searchParams: URLSearchParams
): boolean {
  const section = searchParams.get("section");

  switch (id) {
    case "home":
      return pathname === "/";
    case "create":
      return pathname === "/create";
    case "explore":
      return pathname === "/discover" && section !== "featured";
    case "featured":
      return pathname === "/discover" && section === "featured";
    case "how-it-works":
      return pathname === "/docs/how-it-works";
    case "docs":
      return pathname === "/docs";
    case "swap":
      return pathname === "/swap" || pathname.startsWith("/swap/");
    case "dashboard":
      return pathname === "/dashboard";
    case "my-tokens":
      return pathname === "/my-tokens";
    case "watchlist":
      return pathname === "/watchlist";
    case "following":
      return pathname === "/following";
    case "settings":
      return pathname === "/settings";
    default:
      return false;
  }
}
