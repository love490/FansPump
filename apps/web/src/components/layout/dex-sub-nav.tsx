"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  dexMenuNavLinks,
  isDexNavLinkActive,
} from "@/lib/navigation/swap-nav";

type DexSubNavProps = {
  className?: string;
  onNavigate?: () => void;
  /** Tighter padding for dropdowns / sidebar */
  compact?: boolean;
};

export function DexSubNav({ className, onNavigate, compact }: DexSubNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-10 gap-y-2 border-b border-border bg-transparent px-6 py-3",
        compact && "gap-x-8 px-4 py-2",
        className
      )}
      aria-label="DEX navigation"
    >
      {dexMenuNavLinks.map((link) => {
        const active = isDexNavLinkActive(pathname, link.href);
        return (
          <Link
            key={link.id}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "text-sm font-bold transition-colors",
              compact && "text-xs sm:text-sm",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
