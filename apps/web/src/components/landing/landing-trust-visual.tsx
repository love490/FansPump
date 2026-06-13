"use client";

import { cn } from "@/lib/utils";

type ScoreNode = {
  score: number;
  label: string;
  color: string;
};

const SCORE_NODES: ScoreNode[] = [
  { score: 92, label: "OPN", color: "#3B82F6" },
  { score: 84, label: "FP", color: "#8B5CF6" },
  { score: 78, label: "DEX", color: "#06B6D4" },
];

const STATS = [
  { label: "Avg Trust", value: "84", accent: "from-blue-500/30 to-blue-600/10" },
  { label: "Locked LP", value: "68%", accent: "from-emerald-500/30 to-emerald-600/10" },
  { label: "Verified", value: "1.2K", accent: "from-violet-500/30 to-violet-600/10" },
];

type LandingTrustVisualProps = {
  compact?: boolean;
  className?: string;
};

export function LandingTrustVisual({ compact = false, className }: LandingTrustVisualProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-primary/20 shadow-[0_0_32px_rgba(30,91,255,0.2)]",
        "bg-gradient-to-br from-[#0f172a] via-[#1e3a8a]/40 to-[#312e81]/50",
        compact ? "p-3" : "p-4",
        className
      )}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan-400/20 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-violet-500/25 blur-2xl" />

      <div className={cn("relative flex items-center justify-between", compact ? "mb-3" : "mb-4")}>
        <span
          className={cn(
            "font-semibold uppercase tracking-wider text-blue-200/80",
            compact ? "text-[10px]" : "text-xs"
          )}
        >
          Trust Overview
        </span>
        <span
          className={cn(
            "rounded-full bg-emerald-400/20 font-medium text-emerald-300",
            compact ? "px-2 py-0.5 text-[10px]" : "border border-emerald-400/30 px-2.5 py-0.5 text-[10px]"
          )}
        >
          Live preview
        </span>
      </div>

      <div className={cn("relative grid grid-cols-3", compact ? "gap-2" : "gap-2.5")}>
        {SCORE_NODES.map((node) => (
          <div
            key={node.label}
            className={cn(
              "rounded-lg border border-white/10 bg-white/5 text-center backdrop-blur-sm",
              compact ? "p-2" : "px-2 py-3"
            )}
          >
            <div
              className={cn(
                "mx-auto flex items-center justify-center rounded-full font-bold text-white",
                compact ? "h-9 w-9 text-[11px]" : "h-11 w-11 text-xs"
              )}
              style={{
                backgroundColor: node.color,
                boxShadow: `0 0 16px ${node.color}88`,
              }}
            >
              {node.score}
            </div>
            <p
              className={cn(
                "font-medium text-white/70",
                compact ? "mt-1.5 text-[10px]" : "mt-2 text-[11px]"
              )}
            >
              {node.label}
            </p>
          </div>
        ))}
      </div>

      <div className={cn("relative grid grid-cols-3", compact ? "mt-2 gap-2" : "mt-2.5 gap-2.5")}>
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className={cn(
              "rounded-lg border border-white/10 bg-gradient-to-br text-center",
              stat.accent,
              compact ? "px-1.5 py-2" : "px-2 py-2.5"
            )}
          >
            <p className={cn("font-bold tabular-nums text-white", compact ? "text-sm" : "text-base")}>
              {stat.value}
            </p>
            <p className={cn("text-white/60", compact ? "text-[9px]" : "text-[10px]")}>{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
