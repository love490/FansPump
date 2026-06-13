import type { LucideIcon } from "lucide-react";
import {
  Home,
  Rocket,
  Compass,
  HelpCircle,
  BookOpen,
  LayoutDashboard,
  Coins,
  Bookmark,
  Users,
  ArrowLeftRight,
  Settings,
  Droplets,
  Layers,
  BarChart3,
  Trophy,
  CircleDollarSign,
} from "lucide-react";

export type SidebarNavId =
  | "home"
  | "create"
  | "explore"
  | "leaderboard"
  | "earn"
  | "swap"
  | "pools"
  | "my-liquidity"
  | "staking"
  | "how-it-works"
  | "docs"
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
  { id: "home", href: "/app", label: "Home", icon: Home },
  { id: "create", href: "/create", label: "Create Token", icon: Rocket },
  { id: "explore", href: "/discover?section=trending", label: "Explore Projects", icon: Compass },
  { id: "leaderboard", href: "/leaderboard", label: "Explore Tokens", icon: Trophy },
  { id: "earn", href: "/earn", label: "Earn", icon: CircleDollarSign },
  { id: "swap", href: "/swap", label: "Swap", icon: ArrowLeftRight },
  { id: "pools", href: "/pools", label: "Pools", icon: BarChart3 },
  { id: "my-liquidity", href: "/my-liquidity", label: "Liquidity", icon: Droplets },
  { id: "staking", href: "/staking", label: "Staking", icon: Layers },
  { id: "how-it-works", href: "/docs/how-it-works", label: "How It Works", icon: HelpCircle },
  { id: "docs", href: "/docs", label: "Docs", icon: BookOpen },
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
  switch (id) {
    case "home":
      return pathname === "/app";
    case "create":
      return pathname === "/create";
    case "explore":
      return pathname === "/discover";
    case "leaderboard":
      return pathname === "/leaderboard";
    case "earn":
      return pathname === "/earn";
    case "how-it-works":
      return pathname === "/docs/how-it-works";
    case "docs":
      return pathname === "/docs";
    case "swap":
      return pathname === "/swap" || pathname.startsWith("/swap/");
    case "pools":
      return pathname === "/pools";
    case "my-liquidity":
      return pathname === "/my-liquidity" || pathname.startsWith("/liquidity/");
    case "staking":
      return pathname === "/staking";
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
