"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { DEX_HOME, DEX_LABEL, isDexPath } from "@/lib/navigation/swap-nav";
import { DexSubNav } from "@/components/layout/dex-sub-nav";

type DexNavLinkProps = {
  linkClassName?: string;
  compact?: boolean;
  className?: string;
};

/** Direct link to Swap — horizontal DEX sub-nav appears on DEX routes. */
export function DexNavDropdown({ linkClassName, compact, className }: DexNavLinkProps) {
  const pathname = usePathname();
  const active = isDexPath(pathname);

  return (
    <Link
      href={DEX_HOME}
      className={cn(
        compact
          ? "inline-flex shrink-0 items-center whitespace-nowrap rounded-md px-2 py-1.5 text-[11px] font-medium sm:px-2.5 sm:text-xs"
          : "inline-flex items-center rounded-md px-3 py-2 text-sm font-medium",
        "transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
        linkClassName,
        className
      )}
    >
      {DEX_LABEL}
    </Link>
  );
}

/** @deprecated Use DexNavDropdown */
export const SwapNavDropdown = DexNavDropdown;

export function DexNavMobileLinks({
  onNavigate,
  className,
}: {
  pathname?: string;
  onNavigate?: () => void;
  className?: string;
}) {
  return <DexSubNav className={className} onNavigate={onNavigate} />;
}

/** @deprecated Use DexNavMobileLinks */
export const SwapNavMobileLinks = DexNavMobileLinks;
