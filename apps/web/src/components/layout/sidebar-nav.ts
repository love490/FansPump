import type { LucideIcon } from "lucide-react";
import {
  Home,
  Rocket,
  Compass,
  HelpCircle,
  BookOpen,
  LayoutDashboard,
  Bookmark,
  Users,
  ArrowLeftRight,
  Settings,
  Droplets,
  Layers,
  BarChart3,
  CircleDollarSign,
} from "lucide-react";
import { isSwapPath } from "@/lib/navigation/swap-nav";

export type SidebarNavId =
  | "home"
  | "create"
  | "explore"
  | "leaderboard"
  | "earn"
  | "swap"
  | "pools"
  | "my-liquidity"
  | "lp-management"
  | "analytics"
  | "staking"
  | "how-it-works"
  | "docs"
  | "dashboard"
  | "watchlist"
  | "following"
  | "settings";

export type SidebarNavItem = {
  id: SidebarNavId;
  href: string;
  label: string;
  icon: LucideIcon;
  children?: SidebarNavItem[];
};

export const swapNavChildren: SidebarNavItem[] = [
  { id: "my-liquidity", href: "/my-liquidity", label: "Liquidity", icon: Droplets },
  { id: "pools", href: "/pools", label: "Pools", icon: Layers },
  { id: "staking", href: "/staking", label: "Staking", icon: Layers },
  { id: "lp-management", href: "/my-liquidity", label: "LP Management", icon: Droplets },
  { id: "analytics", href: "/pools", label: "Analytics", icon: BarChart3 },
];

export const platformLinks: SidebarNavItem[] = [
  { id: "home", href: "/", label: "Home", icon: Home },
  { id: "create", href: "/create", label: "Create Token", icon: Rocket },
  { id: "explore", href: "/explore", label: "Explore", icon: Compass },
  { id: "earn", href: "/earn", label: "Earn", icon: CircleDollarSign },
  {
    id: "swap",
    href: "/swap",
    label: "Swap",
    icon: ArrowLeftRight,
    children: swapNavChildren,
  },
  { id: "how-it-works", href: "/docs/how-it-works", label: "How It Works", icon: HelpCircle },
  { id: "docs", href: "/docs", label: "Docs", icon: BookOpen },
];

export const userLinks: SidebarNavItem[] = [
  { id: "dashboard", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
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
  switch (id) {
    case "home":
      return pathname === "/";
    case "create":
      return pathname === "/create";
    case "explore":
      return pathname === "/discover" || pathname === "/explore";
    case "leaderboard":
      return pathname === "/explore";
    case "earn":
      return pathname === "/earn";
    case "how-it-works":
      return pathname === "/docs/how-it-works";
    case "docs":
      return pathname === "/docs";
    case "swap":
      return isSwapPath(pathname);
    case "pools":
    case "analytics":
      return pathname === "/pools" || pathname.startsWith("/pools/");
    case "my-liquidity":
    case "lp-management":
      return pathname === "/my-liquidity" || pathname.startsWith("/liquidity/");
    case "staking":
      return pathname === "/staking";
    case "dashboard":
      return pathname === "/dashboard";
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
