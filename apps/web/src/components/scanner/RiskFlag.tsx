import type { RiskFlag as RiskFlagType } from "@/lib/scanner/types";
import { cn } from "@/lib/utils";

const STYLE = {
  low: "bg-muted text-muted-foreground border-border",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  high: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
  critical: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
} as const;

const ICON = { low: "ℹ", medium: "⚠", high: "🚨", critical: "☠" } as const;

export function RiskFlag({ flag }: { flag: RiskFlagType }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border p-3 text-sm",
        STYLE[flag.severity]
      )}
    >
      <span className="mt-0.5 shrink-0">{ICON[flag.severity]}</span>
      <div>
        <p className="font-medium">{flag.label}</p>
        <p className="mt-0.5 text-xs opacity-80">{flag.description}</p>
      </div>
    </div>
  );
}
