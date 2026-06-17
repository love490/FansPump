"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { DexSubNav } from "@/components/layout/dex-sub-nav";
import { DEX_LABEL, isDexPath } from "@/lib/navigation/swap-nav";

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
        top: rect.bottom + 6,
        left: rect.left,
        minWidth: Math.max(rect.width, 320),
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
      ? "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 py-1.5 text-[11px] font-medium sm:px-2.5 sm:text-xs"
      : "inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium",
    "transition-colors",
    active || open ? "text-primary" : "text-muted-foreground hover:text-foreground",
    linkClassName
  );

  const menu =
    open && menuPos && mounted ? (
      <div
        ref={menuRef}
        role="menu"
        className={cn("fixed z-[200] shadow-xl", menuClassName)}
        style={{
          top: menuPos.top,
          left: menuPos.left,
          minWidth: menuPos.minWidth,
        }}
      >
        <DexSubNav compact onNavigate={() => setOpen(false)} />
      </div>
    ) : null;

  return (
    <>
      <div ref={triggerRef} className={cn("relative inline-flex shrink-0", className)}>
        <button
          type="button"
          className={triggerClass}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={`${DEX_LABEL} menu`}
          onClick={() => setOpen((o) => !o)}
        >
          {DEX_LABEL}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        </button>
      </div>
      {mounted && menu ? createPortal(menu, document.body) : null}
    </>
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
