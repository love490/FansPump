import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
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

/** Home page DEX grid — includes LP Management; Pool covers analytics. */
export const dexNavLinks: DexNavLink[] = [
  { id: "swap", href: "/swap", label: "Swap", icon: ArrowLeftRight },
  { id: "liquidity", href: "/liquidity", label: "Liquidity", icon: Droplets },
  { id: "lp-management", href: "/liquidity", label: "LP Management", icon: Wallet },
  { id: "pool", href: "/pools", label: "Pool", icon: Layers },
  { id: "staking", href: "/staking", label: "Staking", icon: Layers },
];

/** Header / sidebar / mobile DEX menu */
export const dexMenuNavLinks: DexNavLink[] = [
  { id: "swap", href: "/swap", label: "Swap", icon: ArrowLeftRight },
  { id: "liquidity", href: "/liquidity", label: "Liquidity", icon: Droplets },
  { id: "staking", href: "/staking", label: "Staking", icon: Layers },
  { id: "pool", href: "/pools", label: "Pool", icon: Layers },
];

export function isDexNavLinkActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** @deprecated Use dexNavLinks */
export const swapNavLinks = dexNavLinks;

export function isDexPath(pathname: string): boolean {
  return (
    pathname === "/swap" ||
    pathname.startsWith("/swap/") ||
    pathname === "/liquidity" ||
    pathname.startsWith("/liquidity/") ||
    pathname === "/tools" ||
    pathname.startsWith("/tools/") ||
    pathname === "/pools" ||
    pathname.startsWith("/pools/") ||
    pathname === "/staking"
  );
}

/** @deprecated Use isDexPath */
export const isSwapPath = isDexPath;
