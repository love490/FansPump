import type { VerificationLevel } from "@/lib/verification/types";
import { cn } from "@/lib/utils";

type VerifiedBadgeProps = {
  level: VerificationLevel;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  className?: string;
};

const SIZE = {
  sm: "h-3.5 w-3.5 text-[9px]",
  md: "h-4 w-4 text-[11px]",
  lg: "h-5 w-5 text-xs",
};

export function VerifiedBadge({
  level,
  size = "md",
  showTooltip = true,
  className,
}: VerifiedBadgeProps) {
  if (level === "NONE") return null;

  const isFull = level === "FULL";
  const label = isFull ? "Verified — Email + NeoID" : "Email verified";

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full font-bold leading-none",
        SIZE[size],
        isFull ? "bg-amber-400 text-amber-950" : "bg-blue-500 text-white",
        showTooltip && "group cursor-default",
        className
      )}
      aria-label={label}
    >
      {isFull ? "✦" : "✓"}
      {showTooltip && (
        <span
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2
                     whitespace-nowrap rounded-lg border border-border bg-popover px-2.5 py-1.5
                     text-xs text-popover-foreground opacity-0 shadow-xl transition-opacity
                     duration-150 group-hover:opacity-100"
        >
          {label}
        </span>
      )}
    </span>
  );
}
