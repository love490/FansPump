import { cn, formatCompactNumber } from "@/lib/utils";
import { formatLiquidityAmount } from "@/lib/liquidity/format-amount";

type LiquidityMetricBarProps = {
  label: string;
  amount: string;
  pct: number;
  variant: "burn" | "lock";
};

function formatLpAmountDisplay(amount: string): { display: string; full: string } {
  const fullRaw = amount.trim() || "0";
  const full = `${fullRaw} LP`;
  const n = Number(fullRaw);

  if (!Number.isFinite(n)) {
    const trimmed = fullRaw.length > 14 ? `${fullRaw.slice(0, 12)}…` : fullRaw;
    return { display: trimmed, full };
  }

  if (n === 0) return { display: "0", full: "0 LP" };

  if (n >= 1_000) {
    return { display: formatCompactNumber(n), full: `${formatLiquidityAmount(fullRaw)} LP` };
  }

  return { display: formatLiquidityAmount(fullRaw), full: `${formatLiquidityAmount(fullRaw)} LP` };
}

function formatPct(pct: number): string {
  if (pct >= 99.995) return "100";
  if (pct <= 0.005) return "0.00";
  return pct.toFixed(2);
}

export function LiquidityMetricBar({ label, amount, pct }: LiquidityMetricBarProps) {
  const clampedPct = Math.min(100, Math.max(0, pct));
  const barWidth = clampedPct >= 99.995 ? 100 : clampedPct;
  const { display: displayAmount, full: fullAmount } = formatLpAmountDisplay(amount);
  const pctLabel = formatPct(clampedPct);

  return (
    <div className="min-w-0 space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm min-w-0">
        <span className="shrink-0 text-muted-foreground">{label}</span>
        <div className="flex min-w-0 max-w-[62%] items-baseline justify-end gap-1.5 sm:max-w-[68%]">
          <span
            className="min-w-0 truncate text-right font-mono text-xs font-semibold tabular-nums text-foreground sm:text-sm"
            title={fullAmount}
          >
            {displayAmount} LP
          </span>
          <span className="shrink-0 font-sans text-xs font-normal text-muted-foreground sm:text-sm">
            ({pctLabel}%)
          </span>
        </div>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full bg-green-500 transition-all duration-300",
            barWidth > 0 && barWidth < 100 && "min-w-[2px]"
          )}
          style={{ width: `${barWidth}%` }}
          role="progressbar"
          aria-valuenow={barWidth}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label}: ${pctLabel}%`}
        />
      </div>
    </div>
  );
}
