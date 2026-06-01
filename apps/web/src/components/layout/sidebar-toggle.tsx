"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Fixed-size control — no rotate animation (avoids chevron flipping through a “down” arrow). */
export function SidebarToggle({
  collapsed,
  onClick,
  className,
}: {
  collapsed: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground",
        className
      )}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      <span className="relative block h-4 w-4">
        <ChevronLeft
          className={cn(
            "absolute inset-0 h-4 w-4 transition-opacity duration-150",
            collapsed ? "pointer-events-none opacity-0" : "opacity-100"
          )}
          aria-hidden={collapsed}
        />
        <ChevronRight
          className={cn(
            "absolute inset-0 h-4 w-4 transition-opacity duration-150",
            collapsed ? "opacity-100" : "pointer-events-none opacity-0"
          )}
          aria-hidden={!collapsed}
        />
      </span>
    </button>
  );
}
