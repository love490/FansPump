"use client";

import { cn } from "@/lib/utils";
import type { SecurityBadge } from "@/lib/v2/badges";

type SecurityBadgesProps = {
  badges: SecurityBadge[];
  size?: "sm" | "md";
  max?: number;
  className?: string;
};

export function SecurityBadges({ badges, size = "sm", max = 4, className }: SecurityBadgesProps) {
  if (!badges?.length) return null;
  const visible = badges.slice(0, max);
  const extra = badges.length - visible.length;

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {visible.map((badge) => (
        <span
          key={badge.id}
          title={badge.label}
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-muted/40 font-medium text-foreground",
            size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
          )}
        >
          <span aria-hidden>{badge.emoji}</span>
          <span className="hidden sm:inline">{badge.label}</span>
        </span>
      ))}
      {extra > 0 && (
        <span className="text-[10px] text-muted-foreground">+{extra}</span>
      )}
    </div>
  );
}
