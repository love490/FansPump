"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEX_HOME,
  DEX_LABEL,
  dexMenuNavLinks,
  isDexPath,
} from "@/lib/navigation/swap-nav";

type DexNavDropdownProps = {
  linkClassName?: string;
  menuClassName?: string;
  compact?: boolean;
  className?: string;
};

type MenuPosition = {
  top: number;
  left: number;
  minWidth: number;
};

export function DexNavDropdown({ linkClassName, menuClassName, compact, className }: DexNavDropdownProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const active = isDexPath(pathname);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setMenuPos(null);
      return;
    }

    function updatePosition() {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 4,
        left: rect.left,
        minWidth: Math.max(rect.width, 176),
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const triggerClass = cn(
    compact
      ? "inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-md px-2 py-1.5 text-[11px] font-medium sm:px-2.5 sm:text-xs"
      : "inline-flex items-center gap-0.5 rounded-md px-3 py-2 text-sm font-medium",
    "transition-colors",
    active || open ? "text-primary" : "text-muted-foreground hover:text-foreground",
    linkClassName
  );

  const menu =
    open && menuPos && mounted ? (
      <div
        ref={menuRef}
        role="menu"
        className={cn(
          "fixed z-[200] rounded-xl border border-border bg-background py-1.5 shadow-xl",
          menuClassName
        )}
        style={{
          top: menuPos.top,
          left: menuPos.left,
          minWidth: menuPos.minWidth,
        }}
      >
        {dexMenuNavLinks.map((link) => (
          <Link
            key={link.id}
            href={link.href}
            role="menuitem"
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
    ) : null;

  return (
    <>
      <div ref={triggerRef} className={cn("relative inline-flex shrink-0", className)}>
        <div className={triggerClass}>
          <Link href={DEX_HOME} onClick={() => setOpen(false)}>
            {DEX_LABEL}
          </Link>
          <button
            type="button"
            className="rounded p-0.5 hover:bg-muted/60"
            aria-expanded={open}
            aria-haspopup="menu"
            aria-label={`Open ${DEX_LABEL} menu`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen((o) => !o);
            }}
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
          </button>
        </div>
      </div>
      {mounted && menu ? createPortal(menu, document.body) : null}
    </>
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
      {dexMenuNavLinks.map((link) => (
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
