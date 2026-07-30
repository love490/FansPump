"use client";

import { useMemo } from "react";
import { PieChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildAllocation, type AllocationCategory } from "@/lib/dashboard/allocation";
import { formatBalanceTotal, type PortfolioAsset } from "@/lib/dashboard/wallet-balance";
import { cn } from "@/lib/utils";

const SIZE = 120;
const STROKE = 18;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Keeps adjacent segments visually separated without distorting small slices. */
const GAP_PERCENT = 0.6;

type DashboardAllocationCardProps = {
  assets: PortfolioAsset[];
  loading?: boolean;
  onSelectCategory?: (category: AllocationCategory) => void;
};

export function DashboardAllocationCard({
  assets,
  loading = false,
  onSelectCategory,
}: DashboardAllocationCardProps) {
  const { slices, totalUsd } = useMemo(() => buildAllocation(assets), [assets]);

  const segments = useMemo(() => {
    let offset = 0;
    return slices.map((slice) => {
      const visible = Math.max(slice.percent - GAP_PERCENT, 0);
      const dash = (visible / 100) * CIRCUMFERENCE;
      const segment = {
        ...slice,
        dash,
        offset: (offset / 100) * CIRCUMFERENCE,
      };
      offset += slice.percent;
      return segment;
    });
  }, [slices]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <PieChart className="h-4 w-4 text-primary" />
          Portfolio allocation
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && slices.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Calculating allocation…</p>
        ) : slices.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No priced assets yet. Allocation appears once your holdings have a market value.
          </p>
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="relative shrink-0">
              <svg
                width={SIZE}
                height={SIZE}
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                role="img"
                aria-label="Portfolio allocation by asset type"
              >
                <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
                  <circle
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={RADIUS}
                    fill="none"
                    strokeWidth={STROKE}
                    className="text-muted"
                    stroke="currentColor"
                    opacity={0.25}
                  />
                  {segments.map((segment) => (
                    <circle
                      key={segment.category}
                      cx={SIZE / 2}
                      cy={SIZE / 2}
                      r={RADIUS}
                      fill="none"
                      strokeWidth={STROKE}
                      strokeLinecap="butt"
                      stroke="currentColor"
                      className={segment.colorClass}
                      strokeDasharray={`${segment.dash} ${CIRCUMFERENCE - segment.dash}`}
                      strokeDashoffset={-segment.offset}
                    />
                  ))}
                </g>
              </svg>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Total
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {formatBalanceTotal(totalUsd, "USD")}
                </span>
              </div>
            </div>

            <ul className="w-full space-y-1.5">
              {slices.map((slice) => (
                <li key={slice.category}>
                  <button
                    type="button"
                    onClick={() => onSelectCategory?.(slice.category)}
                    disabled={!onSelectCategory}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
                      onSelectCategory && "hover:bg-muted/50"
                    )}
                  >
                    <span
                      className={cn("h-2.5 w-2.5 shrink-0 rounded-full bg-current", slice.colorClass)}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">{slice.label}</span>
                    <span className="shrink-0 text-sm font-medium tabular-nums">
                      {slice.percent.toFixed(1)}%
                    </span>
                    <span className="w-20 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                      {formatBalanceTotal(slice.usdValue, "USD")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
