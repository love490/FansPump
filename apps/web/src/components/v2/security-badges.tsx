"use client";

import { cn } from "@/lib/utils";
import type { SecurityBadge, SecurityBadgeId } from "@/lib/v2/badges";
import { ContractVerifiedIcon } from "@/components/icons/contract-verified-icon";

type SecurityBadgesProps = {
  badges: SecurityBadge[];
  size?: "sm" | "md";
  max?: number;
  className?: string;
  /** Icon-only badges (no text pill) — good for compact token cards. */
  iconOnly?: boolean;
};

function BadgeIcon({ id, emoji }: { id: SecurityBadgeId; emoji: string }) {
  if (id === "contract_verified") {
    return <ContractVerifiedIcon size={14} className="h-3.5 w-3.5" />;
  }
  return <span aria-hidden>{emoji}</span>;
}

export function SecurityBadges({
  badges,
  size = "sm",
  max = 4,
  className,
  iconOnly = false,
}: SecurityBadgesProps) {
  if (!badges?.length) return null;
  const visible = badges.slice(0, max);
  const extra = badges.length - visible.length;

  if (iconOnly) {
    return (
      <div className={cn("flex flex-wrap items-center gap-1", className)}>
        {visible.map((badge) => (
          <span key={badge.id} title={badge.label} className="inline-flex">
            <BadgeIcon id={badge.id} emoji={badge.emoji} />
          </span>
        ))}
        {extra > 0 && (
          <span className="text-[10px] text-muted-foreground">+{extra}</span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {visible.map((badge) => (
        <span
          key={badge.id}
          title={badge.label}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 font-medium text-foreground",
            badge.id === "contract_verified" && "border-emerald-500/20 bg-emerald-500/5",
            size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
          )}
        >
          <BadgeIcon id={badge.id} emoji={badge.emoji} />
          <span className="hidden sm:inline">{badge.label}</span>
        </span>
      ))}
      {extra > 0 && (
        <span className="text-[10px] text-muted-foreground">+{extra}</span>
      )}
    </div>
  );
}
