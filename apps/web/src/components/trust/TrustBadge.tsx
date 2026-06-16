import type { TrustTier } from "@/lib/trust/types";
import { cn } from "@/lib/utils";

const TIER_CONFIG: Record<
  TrustTier,
  { label: string; dot: string; bg: string; text: string; border: string }
> = {
  HIGH: {
    label: "Trusted",
    dot: "🟢",
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/30",
  },
  MEDIUM: {
    label: "Caution",
    dot: "🟡",
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/30",
  },
  LOW: {
    label: "High Risk",
    dot: "🔴",
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-500/30",
  },
};

type TrustBadgeProps = {
  tier: TrustTier;
  score: number;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function TrustBadge({ tier, score, onClick, size = "md", className }: TrustBadgeProps) {
  const config = TIER_CONFIG[tier];
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5 gap-1",
    md: "text-sm px-3 py-1 gap-1.5",
    lg: "text-base px-4 py-2 gap-2",
  };

  const Tag = onClick ? "button" : "span";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full border font-medium transition-colors",
        config.bg,
        config.text,
        config.border,
        sizeClasses[size],
        onClick && "cursor-pointer hover:brightness-110 active:scale-95",
        !onClick && "cursor-default",
        className
      )}
    >
      <span>{config.dot}</span>
      <span>{config.label}</span>
      <span className="opacity-60">·</span>
      <span className="tabular-nums">{score}</span>
    </Tag>
  );
}
