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
        "flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg bg-zinc-950 px-4 py-3",
        compact && "gap-x-4 px-3 py-2",
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
              active ? "text-white" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
