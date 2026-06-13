"use client";

import { cn } from "@/lib/utils";

type Node = {
  cx: number;
  cy: number;
  score: number;
  label: string;
  color: string;
};

const NODES: Node[] = [
  { cx: 52, cy: 48, score: 92, label: "OPN", color: "#3B82F6" },
  { cx: 248, cy: 42, score: 84, label: "FP", color: "#8B5CF6" },
  { cx: 150, cy: 95, score: 78, label: "DEX", color: "#06B6D4" },
  { cx: 248, cy: 128, score: 71, label: "LP", color: "#F59E0B" },
  { cx: 52, cy: 132, score: 88, label: "CV", color: "#22C55E" },
];

const EDGES: [number, number][] = [
  [0, 1],
  [0, 2],
  [1, 2],
  [2, 3],
  [2, 4],
  [0, 4],
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
  if (compact) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-primary/20 p-3 shadow-[0_0_32px_rgba(30,91,255,0.2)]",
          "bg-gradient-to-br from-[#0f172a] via-[#1e3a8a]/40 to-[#312e81]/50",
          className
        )}
      >
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan-400/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-violet-500/25 blur-2xl" />

        <div className="relative mb-3 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-200/80">
            Trust Overview
          </span>
          <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
            Live preview
          </span>
        </div>

        <div className="relative grid grid-cols-3 gap-2">
          {NODES.slice(0, 3).map((node) => (
            <div
              key={node.label}
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-center backdrop-blur-sm"
            >
              <div
                className="mx-auto flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-lg"
                style={{ backgroundColor: node.color, boxShadow: `0 0 14px ${node.color}66` }}
              >
                {node.score}
              </div>
              <p className="mt-1.5 text-[10px] font-medium text-white/70">{node.label}</p>
            </div>
          ))}
        </div>

        <div className="relative mt-2 grid grid-cols-3 gap-2">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className={cn(
                "rounded-lg border border-white/10 bg-gradient-to-br px-1.5 py-2 text-center",
                stat.accent
              )}
            >
              <p className="text-sm font-bold tabular-nums text-white">{stat.value}</p>
              <p className="text-[9px] text-white/60">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-primary/25 p-4 shadow-[0_0_40px_rgba(30,91,255,0.25)]",
        "bg-gradient-to-br from-[#0c1222] via-[#1e3a8a]/50 to-[#4c1d95]/40",
        className
      )}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-8 left-1/4 h-28 w-28 rounded-full bg-purple-500/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-24 w-24 rounded-full bg-cyan-400/15 blur-2xl" />

      <div className="relative mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-blue-100/90">
          Trust Overview
        </span>
        <span className="rounded-full border border-emerald-400/30 bg-emerald-400/15 px-2.5 py-0.5 text-[10px] font-medium text-emerald-300">
          Live preview
        </span>
      </div>

      <div className="relative rounded-xl border border-white/10 bg-black/25 p-2 backdrop-blur-sm">
        <svg viewBox="0 0 300 170" className="h-auto w-full" aria-hidden>
          {EDGES.map(([a, b], i) => (
            <line
              key={`edge-${i}`}
              x1={NODES[a].cx}
              y1={NODES[a].cy}
              x2={NODES[b].cx}
              y2={NODES[b].cy}
              stroke="url(#trustLineGrad)"
              strokeWidth="1.5"
              strokeDasharray="5 4"
              opacity={0.7}
            />
          ))}
          <defs>
            <linearGradient id="trustLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#A78BFA" />
            </linearGradient>
          </defs>
          {NODES.map((node) => (
            <g key={node.label}>
              <circle cx={node.cx} cy={node.cy} r="18" fill={node.color} opacity={0.25} />
              <circle
                cx={node.cx}
                cy={node.cy}
                r="14"
                fill={node.color}
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="1.5"
              />
              <text
                x={node.cx}
                y={node.cy + 4}
                textAnchor="middle"
                fill="white"
                fontSize="11"
                fontWeight="700"
              >
                {node.score}
              </text>
              <text
                x={node.cx}
                y={node.cy + 28}
                textAnchor="middle"
                fill="rgba(255,255,255,0.65)"
                fontSize="9"
                fontWeight="600"
              >
                {node.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="relative mt-3 grid grid-cols-3 gap-2">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className={cn(
              "rounded-lg border border-white/10 bg-gradient-to-br px-2 py-2 text-center",
              stat.accent
            )}
          >
            <p className="text-sm font-bold tabular-nums text-white">{stat.value}</p>
            <p className="text-[9px] text-white/60">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
