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
  CircleDollarSign,
  Megaphone,
  LifeBuoy,
} from "lucide-react";

export type SidebarNavId =
  | "home"
  | "create"
  | "discover"
  | "earn"
  | "dex"
  | "swap"
  | "pools"
  | "my-liquidity"
  | "lp-management"
  | "analytics"
  | "staking"
  | "launchpool"
  | "support"
  | "advertise"
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

export const dexNavChildren: SidebarNavItem[] = [
  { id: "swap", href: "/swap", label: "Swap", icon: ArrowLeftRight },
  { id: "my-liquidity", href: "/liquidity", label: "Liquidity", icon: Droplets },
  { id: "staking", href: "/staking", label: "Staking", icon: Layers },
  { id: "pools", href: "/pools", label: "Pool", icon: Layers },
];

/** @deprecated Use dexNavChildren */
export const swapNavChildren = dexNavChildren;

export const platformLinks: SidebarNavItem[] = [
  { id: "home", href: "/", label: "Home", icon: Home },
  { id: "create", href: "/create", label: "Create Token", icon: Rocket },
  { id: "discover", href: "/discover?section=all", label: "Discover", icon: Compass },
  { id: "earn", href: "/earn", label: "Earn", icon: CircleDollarSign },
  { id: "launchpool", href: "/launchpool", label: "Launchpool", icon: Rocket },
  {
    id: "dex",
    href: "/swap",
    label: "DEX",
    icon: ArrowLeftRight,
    children: dexNavChildren,
  },
  { id: "how-it-works", href: "/docs/how-it-works", label: "How It Works", icon: HelpCircle },
  { id: "docs", href: "/docs", label: "Docs", icon: BookOpen },
];

export const accountFooterLinks: SidebarNavItem[] = [
  { id: "support", href: "/support", label: "Support", icon: LifeBuoy },
  { id: "advertise", href: "/advertise", label: "Advertise", icon: Megaphone },
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
    case "discover":
      return pathname === "/discover";
    case "earn":
      return pathname === "/earn";
    case "how-it-works":
      return pathname === "/docs/how-it-works";
    case "docs":
      return pathname === "/docs";
    case "dex":
      return false;
    case "swap":
      return pathname === "/swap" || pathname.startsWith("/swap/");
    case "pools":
      return pathname === "/pools" || pathname.startsWith("/pools/");
    case "my-liquidity":
    case "lp-management":
      return pathname === "/liquidity" || pathname.startsWith("/liquidity/");
    case "staking":
      return pathname === "/staking";
    case "launchpool":
      return pathname === "/launchpool";
    case "support":
      return pathname === "/support";
    case "advertise":
      return pathname === "/advertise";
    case "analytics":
      return pathname === "/pools" || pathname.startsWith("/pools/");
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
