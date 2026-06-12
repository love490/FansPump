"use client";

import { motion } from "framer-motion";
import { BRAND_BLUE } from "@/lib/brand";

/** Data-driven trust dashboard preview — replaces rocket/space hero imagery. */
export function LandingTrustVisual() {
  const nodes = [
    { x: "18%", y: "28%", score: 92, label: "OPN" },
    { x: "72%", y: "22%", score: 84, label: "FP" },
    { x: "48%", y: "58%", score: 78, label: "DEX" },
    { x: "82%", y: "62%", score: 71, label: "LP" },
    { x: "28%", y: "68%", score: 88, label: "CV" },
  ];

  return (
    <div className="relative h-full min-h-[220px] w-full overflow-hidden rounded-xl border border-white/10 bg-[#0a1628]/80 p-4 shadow-[0_0_40px_rgba(30,91,255,0.15)] backdrop-blur-sm sm:min-h-[260px] lg:min-h-[280px]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(30,91,255,0.25),transparent_55%)]" />
      <div className="relative flex h-full flex-col">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50 sm:text-xs">
            Trust Overview
          </span>
          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
            Live preview
          </span>
        </div>

        <div className="relative flex-1 rounded-lg border border-white/5 bg-black/20">
          <svg className="absolute inset-0 h-full w-full" aria-hidden>
            {nodes.slice(0, -1).map((n, i) => {
              const next = nodes[i + 1];
              return (
                <line
                  key={`line-${i}`}
                  x1={n.x}
                  y1={n.y}
                  x2={next.x}
                  y2={next.y}
                  stroke="rgba(30,91,255,0.35)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              );
            })}
          </svg>

          {nodes.map((node, i) => (
            <motion.div
              key={node.label}
              className="absolute flex flex-col items-center"
              style={{ left: node.x, top: node.y, transform: "translate(-50%, -50%)" }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + i * 0.08 }}
            >
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/40 bg-primary/20 text-[10px] font-bold text-white shadow-[0_0_12px_rgba(30,91,255,0.4)] sm:h-10 sm:w-10 sm:text-xs"
                style={{ boxShadow: `0 0 16px ${BRAND_BLUE}55` }}
              >
                {node.score}
              </div>
              <span className="mt-1 text-[9px] font-medium text-white/60">{node.label}</span>
            </motion.div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { label: "Avg Trust", value: "84" },
            { label: "Locked LP", value: "68%" },
            { label: "Verified", value: "1.2K" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-center"
            >
              <p className="text-sm font-bold tabular-nums text-white">{stat.value}</p>
              <p className="text-[9px] text-white/50">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
