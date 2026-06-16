"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type TrustScoreBarProps = {
  label: string;
  score: number;
  weight: number;
  colorClass: string;
};

export function TrustScoreBar({ label, score, weight, colorClass }: TrustScoreBarProps) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => setWidth(score), 100);
    return () => clearTimeout(timeout);
  }, [score]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">weight {Math.round(weight * 100)}%</span>
          <span className="w-8 text-right font-semibold tabular-nums">{score}</span>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", colorClass)}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
