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
  CircleDollarSign,
  Megaphone,
  LifeBuoy,
  Shield,
  Wrench,
} from "lucide-react";
import { isDexPath } from "@/lib/navigation/swap-nav";
import { isToolsPath } from "@/lib/navigation/tools-nav";

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
  | "tools"
  | "trustscan"
  | "support"
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

export const platformLinks: SidebarNavItem[] = [
  { id: "home", href: "/", label: "Home", icon: Home },
  { id: "create", href: "/create", label: "Create Token", icon: Rocket },
  { id: "discover", href: "/discover?section=all", label: "Discover", icon: Compass },
  { id: "dex", href: "/swap", label: "DEX", icon: ArrowLeftRight },
  { id: "trustscan", href: "/trustscan", label: "TrustScan", icon: Shield },
  { id: "earn", href: "/earn", label: "Earn", icon: CircleDollarSign },
  { id: "launchpool", href: "/launchpool", label: "Launchpool", icon: Megaphone },
  { id: "tools", href: "/tools", label: "Tools", icon: Wrench },
  { id: "how-it-works", href: "/docs/how-it-works", label: "How It Works", icon: HelpCircle },
  { id: "docs", href: "/docs", label: "Docs", icon: BookOpen },
];

export const accountFooterLinks: SidebarNavItem[] = [
  { id: "support", href: "/support", label: "Support", icon: LifeBuoy },
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

export function isSidebarNavActive(id: SidebarNavId, pathname: string): boolean {
  switch (id) {
    case "home":
      return pathname === "/";
    case "create":
      return pathname === "/create";
    case "discover":
      return pathname === "/discover";
    case "trustscan":
      return pathname === "/trustscan";
    case "earn":
      return pathname === "/earn";
    case "how-it-works":
      return pathname === "/docs/how-it-works";
    case "docs":
      return pathname === "/docs";
    case "dex":
      return isDexPath(pathname);
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
    case "tools":
      return isToolsPath(pathname);
    case "support":
      return pathname === "/support";
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
