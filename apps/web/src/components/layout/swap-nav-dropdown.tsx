"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEX_HOME,
  DEX_LABEL,
  dexNavLinks,
  isDexPath,
} from "@/lib/navigation/swap-nav";

type DexNavDropdownProps = {
  linkClassName?: string;
  menuClassName?: string;
  compact?: boolean;
  className?: string;
};

export function DexNavDropdown({ linkClassName, menuClassName, compact, className }: DexNavDropdownProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = isDexPath(pathname);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const triggerClass = cn(
    compact
      ? "inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-md px-2 py-1.5 text-[11px] font-medium sm:px-2.5 sm:text-xs"
      : "inline-flex items-center gap-0.5 rounded-md px-3 py-2 text-sm font-medium",
    "transition-colors",
    active ? "text-primary" : "text-muted-foreground hover:text-foreground",
    linkClassName
  );

  return (
    <div
      ref={ref}
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className={triggerClass}>
        <Link href={DEX_HOME} onClick={() => setOpen(false)}>
          {DEX_LABEL}
        </Link>
        <button
          type="button"
          className="rounded p-0.5 hover:bg-muted/60"
          aria-expanded={open}
          aria-label={`Open ${DEX_LABEL} menu`}
          onClick={() => setOpen((o) => !o)}
        >
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        </button>
      </div>

      {open && (
        <div
          className={cn(
            "absolute left-0 top-full z-50 mt-1 min-w-[11rem] rounded-xl border border-border bg-background py-1.5 shadow-xl",
            menuClassName
          )}
        >
          {dexNavLinks.map((link) => (
            <Link
              key={link.id}
              href={link.href}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted",
                pathname === link.href || pathname.startsWith(`${link.href}/`)
                  ? "text-primary"
                  : "text-foreground"
              )}
              onClick={() => setOpen(false)}
            >
              <link.icon className="h-4 w-4 shrink-0 text-primary" />
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/** @deprecated Use DexNavDropdown */
export const SwapNavDropdown = DexNavDropdown;

export function DexNavMobileLinks({
  pathname,
  onNavigate,
  className,
}: {
  pathname: string;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {DEX_LABEL}
      </p>
      {dexNavLinks.map((link) => (
        <Link
          key={link.id}
          href={link.href}
          className={cn(
            "block rounded-lg px-3 py-2.5 text-sm font-medium",
            pathname === link.href || pathname.startsWith(`${link.href}/`)
              ? "bg-primary/10 text-primary"
              : "hover:bg-muted"
          )}
          onClick={onNavigate}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}

/** @deprecated Use DexNavMobileLinks */
export const SwapNavMobileLinks = DexNavMobileLinks;
