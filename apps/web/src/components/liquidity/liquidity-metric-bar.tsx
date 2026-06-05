import { cn } from "@/lib/utils";

type LiquidityMetricBarProps = {
  label: string;
  amount: string;
  pct: number;
  variant: "burn" | "lock";
};

export function LiquidityMetricBar({ label, amount, pct, variant }: LiquidityMetricBarProps) {
  const clampedPct = Math.min(100, Math.max(0, pct));

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-semibold tabular-nums text-foreground">
          {amount} LP
          <span className="ml-1.5 font-sans font-normal text-muted-foreground">({clampedPct.toFixed(2)}%)</span>
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            variant === "burn" ? "bg-red-500/80" : "bg-amber-500/80"
          )}
          style={{ width: `${clampedPct}%` }}
        />
      </div>
    </div>
  );
}
