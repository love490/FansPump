"use client";

import { useMemo } from "react";
import type { ChartPoint } from "@iopn/shared";
import { cn } from "@/lib/utils";

const VIEW_WIDTH = 560;
const VIEW_HEIGHT = 140;

function buildPath(points: ChartPoint[]): { line: string; area: string } | null {
  if (points.length < 2) return null;
  const values = points.map((p) => p.v);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const spanV = maxV - minV || Math.max(maxV, 1);

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * VIEW_WIDTH;
    const y = VIEW_HEIGHT - ((p.v - minV) / spanV) * (VIEW_HEIGHT - 8) - 4;
    return { x, y };
  });

  const line = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(2)},${c.y.toFixed(2)}`)
    .join(" ");
  return { line, area: `${line} L${VIEW_WIDTH},${VIEW_HEIGHT} L0,${VIEW_HEIGHT} Z` };
}

export function AnalyticsLineChart({
  title,
  points,
  valuePrefix = "",
  className,
  positive,
}: {
  title: string;
  points: ChartPoint[];
  valuePrefix?: string;
  className?: string;
  positive?: boolean;
}) {
  const path = useMemo(() => buildPath(points), [points]);
  const latest = points.at(-1)?.v ?? 0;
  const strokeClass =
    positive === undefined
      ? "text-primary"
      : positive
        ? "text-emerald-500"
        : "text-red-500";

  if (points.length === 0) {
    return (
      <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-6 text-center text-sm text-muted-foreground">No data for this period.</p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs tabular-nums text-muted-foreground">
          {valuePrefix}
          {latest.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </p>
      </div>
      {path ? (
        <svg
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          className="h-[140px] w-full"
          preserveAspectRatio="none"
          role="img"
          aria-label={title}
        >
          <path d={path.area} className={cn("fill-current opacity-10", strokeClass)} />
          <path
            d={path.line}
            fill="none"
            className={cn("stroke-current", strokeClass)}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">Not enough data points.</p>
      )}
    </div>
  );
}

export function AnalyticsBarChart({
  title,
  items,
  className,
}: {
  title: string;
  items: { label: string; value: number }[];
  className?: string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);

  if (items.length === 0) {
    return (
      <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-6 text-center text-sm text-muted-foreground">No data available.</p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <p className="mb-3 text-sm font-medium">{title}</p>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="truncate text-muted-foreground">{item.label}</span>
              <span className="tabular-nums font-medium">{item.value.toLocaleString()}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
