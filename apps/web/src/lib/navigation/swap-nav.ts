import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  BarChart3,
  Droplets,
  Layers,
} from "lucide-react";

export const SWAP_HOME = "/swap";

export type SwapNavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const swapNavLinks: SwapNavLink[] = [
  { href: "/swap", label: "Swap", icon: ArrowLeftRight },
  { href: "/my-liquidity", label: "Liquidity", icon: Droplets },
  { href: "/pools", label: "Pools", icon: Layers },
  { href: "/staking", label: "Staking", icon: Layers },
  { href: "/my-liquidity", label: "LP Management", icon: Droplets },
  { href: "/pools", label: "Analytics", icon: BarChart3 },
];

export function isSwapPath(pathname: string): boolean {
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
