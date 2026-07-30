"use client";

import { useMemo, useState } from "react";
import {
  computePortfolioChange,
  formatChangePercent,
  PORTFOLIO_RANGE_LABELS,
  type PortfolioPoint,
  type PortfolioRange,
} from "@/lib/dashboard/portfolio-history";
import { formatBalanceTotal } from "@/lib/dashboard/wallet-balance";
import { cn } from "@/lib/utils";

const RANGES: PortfolioRange[] = ["24h", "7d", "30d", "all"];

const RANGE_MS: Record<PortfolioRange, number | null> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  all: null,
};

const VIEW_WIDTH = 600;
const VIEW_HEIGHT = 120;

function buildPath(points: PortfolioPoint[]): { line: string; area: string } | null {
  if (points.length < 2) return null;

  const times = points.map((p) => p.t);
  const values = points.map((p) => p.usd);
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const spanT = maxT - minT || 1;
  const spanV = maxV - minV || Math.max(maxV, 1);

  const coords = points.map((p) => {
    const x = ((p.t - minT) / spanT) * VIEW_WIDTH;
    const y = VIEW_HEIGHT - ((p.usd - minV) / spanV) * (VIEW_HEIGHT - 8) - 4;
    return { x, y };
  });

  const line = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(2)},${c.y.toFixed(2)}`)
    .join(" ");
  const area = `${line} L${VIEW_WIDTH},${VIEW_HEIGHT} L0,${VIEW_HEIGHT} Z`;

  return { line, area };
}

export function DashboardPortfolioChart({
  history,
  currentUsd,
}: {
  history: PortfolioPoint[];
  currentUsd: number;
}) {
  const [range, setRange] = useState<PortfolioRange>("7d");

  const points = useMemo(() => {
    const windowMs = RANGE_MS[range];
    if (windowMs === null) return history;
    const cutoff = Date.now() - windowMs;
    const inRange = history.filter((p) => p.t >= cutoff);
    return inRange.length >= 2 ? inRange : history.slice(-2);
  }, [history, range]);

  const change = useMemo(
    () => computePortfolioChange(history, currentUsd, range),
    [history, currentUsd, range]
  );

  const path = buildPath(points);
  const positive = (change?.usd ?? 0) >= 0;
  const strokeClass = positive ? "text-emerald-500" : "text-red-500";

  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-background/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Portfolio
          </p>
          <p className="text-sm font-semibold tabular-nums">
            {formatBalanceTotal(currentUsd, "USD")}
            {change && (
              <span
                className={cn(
                  "ml-2 text-xs font-medium",
                  positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                )}
              >
                {formatChangePercent(change.percent)}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-1">
          {RANGES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRange(option)}
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
                range === option
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/60"
              )}
            >
              {PORTFOLIO_RANGE_LABELS[option]}
            </button>
          ))}
        </div>
      </div>

      {path ? (
        <svg
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          preserveAspectRatio="none"
          className={cn("h-24 w-full", strokeClass)}
          role="img"
          aria-label={`Portfolio value over ${PORTFOLIO_RANGE_LABELS[range]}`}
        >
          <path d={path.area} fill="currentColor" opacity={0.12} />
          <path
            d={path.line}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ) : (
        <p className="py-6 text-center text-xs text-muted-foreground">
          Collecting portfolio history — the chart fills in as you check back.
        </p>
      )}
    </div>
  );
}
