import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  BarChart3,
  Droplets,
  Layers,
  Wallet,
} from "lucide-react";

export const DEX_LABEL = "DEX";
export const DEX_HOME = "/swap";

/** @deprecated Use DEX_HOME */
export const SWAP_HOME = DEX_HOME;

export type DexNavLink = {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
};

export const dexNavLinks: DexNavLink[] = [
  { id: "swap", href: "/swap", label: "Swap", icon: ArrowLeftRight },
  { id: "liquidity", href: "/my-liquidity", label: "Liquidity", icon: Droplets },
  { id: "lp-management", href: "/my-liquidity", label: "LP Management", icon: Wallet },
  { id: "pool", href: "/pools", label: "Pool", icon: Layers },
  { id: "staking", href: "/staking", label: "Staking", icon: Layers },
  { id: "analytics", href: "/pools", label: "Analytics", icon: BarChart3 },
];

/** @deprecated Use dexNavLinks */
export const swapNavLinks = dexNavLinks;

export function isDexPath(pathname: string): boolean {
  return (
    pathname === "/swap" ||
    pathname.startsWith("/swap/") ||
    pathname === "/my-liquidity" ||
    pathname.startsWith("/liquidity/") ||
    pathname === "/pools" ||
    pathname.startsWith("/pools/") ||
    pathname === "/staking"
  );
}

/** @deprecated Use isDexPath */
export const isSwapPath = isDexPath;
