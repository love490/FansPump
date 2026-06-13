"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPlatformStats, tokenQueryKeys } from "@/lib/tokens-api";
import { getActiveChainId } from "@/lib/chain-config/opn";
import {
  buildTrustDashboardMetrics,
  formatDashboardCount,
  formatDashboardCurrency,
  type TrustDashboardMetrics,
} from "@/lib/landing/trust-dashboard";
import { cn } from "@/lib/utils";

function useAnimatedNumber(target: number, duration = 1400, enabled = true) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setValue(target);
      return;
    }
    setValue(0);
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, enabled]);

  return value;
}

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
      </span>
      Live
    </span>
  );
}

function MetricBlock({
  value,
  label,
  description,
  suffix = "",
  formatValue,
  animate = true,
  className,
  accent = "from-[#1E5BFF]/15 via-indigo-500/5 to-cyan-500/5",
}: {
  value: number;
  label: string;
  description: string;
  suffix?: string;
  formatValue?: (n: number) => string;
  animate?: boolean;
  className?: string;
  accent?: string;
}) {
  const animated = useAnimatedNumber(value, 1400, animate);
  const display = formatValue ? formatValue(animated) : `${animated.toLocaleString()}${suffix}`;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-white/[0.08] p-4 backdrop-blur-md transition-all duration-300 sm:p-5",
        "bg-gradient-to-br from-[#070f1f]/90 via-[#0c1830]/85 to-[#101f3d]/80",
        "shadow-[0_8px_32px_rgba(0,0,0,0.35)] hover:border-[#1E5BFF]/35 hover:shadow-[0_0_40px_rgba(30,91,255,0.12)]",
        className
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80 transition-opacity group-hover:opacity-100",
          accent
        )}
      />
      <div className="relative">
        <p className="text-3xl font-bold tabular-nums tracking-tight text-white sm:text-4xl">
          {display}
        </p>
        <p className="mt-1 text-sm font-medium text-blue-100/90">{label}</p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">{description}</p>
      </div>
    </div>
  );
}

function HealthScoreBlock({ metrics, animate }: { metrics: TrustDashboardMetrics; animate: boolean }) {
  const score = useAnimatedNumber(metrics.healthScore, 1600, animate);

  return (
    <div
      className={cn(
        "group relative col-span-1 overflow-hidden rounded-xl border border-[#1E5BFF]/20 p-5 backdrop-blur-md sm:col-span-2 lg:col-span-4 lg:p-6",
        "bg-gradient-to-r from-[#070f1f]/95 via-[#0e1f45]/90 to-[#0a2848]/90",
        "shadow-[0_8px_40px_rgba(0,0,0,0.4)] hover:border-[#1E5BFF]/40 hover:shadow-[0_0_48px_rgba(30,91,255,0.15)]"
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(30,91,255,0.18),transparent_55%)]" />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-100/80">Ecosystem Health Score</p>
          <p className="mt-2 text-4xl font-bold tabular-nums text-white sm:text-5xl">
            {score}
            <span className="text-2xl font-semibold text-slate-400 sm:text-3xl">/100</span>
          </p>
          <p className="mt-2 text-sm font-medium text-cyan-300/90">{metrics.healthLabel}</p>
        </div>
        <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/10 sm:mt-0">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#1E5BFF] via-indigo-400 to-cyan-400 transition-all duration-1000"
            style={{ width: `${Math.min(100, metrics.healthScore)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function LandingTrustDashboard() {
  const chainId = getActiveChainId();
  const { data: stats, isLoading } = useQuery({
    queryKey: tokenQueryKeys.stats(chainId),
    queryFn: fetchPlatformStats,
    staleTime: 30_000,
  });

  const metrics = buildTrustDashboardMetrics(isLoading ? null : stats);
  const animate = !isLoading;

  return (
    <section id="trust-dashboard" className="mx-auto w-full max-w-[1200px]">
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Ecosystem Trust Dashboard
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Real-time transparency across the OPN ecosystem.
          </p>
        </div>
        <LiveBadge />
      </div>

      {metrics.source === "mock" && !isLoading && (
        <p className="mb-4 text-[11px] uppercase tracking-wide text-muted-foreground/70">
          Preview metrics — live aggregation rolling out
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        <MetricBlock
          value={metrics.trustIndex}
          label="Trust Index"
          description="Based on liquidity, verification and ownership status."
          animate={animate}
          className="sm:col-span-1 lg:col-span-2"
          accent="from-[#1E5BFF]/20 via-blue-600/10 to-indigo-500/5"
        />
        <MetricBlock
          value={metrics.verifiedProjects}
          label="Verified Projects"
          description="Contracts approved and surfaced as verified on FansPump."
          animate={animate}
          className="sm:col-span-1 lg:col-span-2"
          accent="from-indigo-500/20 via-[#1E5BFF]/10 to-cyan-500/5"
        />
        <MetricBlock
          value={metrics.liquidityLockedPct}
          label="Liquidity Locked"
          description="Share of tracked projects with locked or burned LP."
          suffix="%"
          animate={animate}
          className="lg:col-span-2"
          accent="from-cyan-500/15 via-[#1E5BFF]/10 to-indigo-500/5"
        />
        <MetricBlock
          value={metrics.ownershipRenouncedPct}
          label="Ownership Renounced"
          description="Projects with renounced ownership on-chain."
          suffix="%"
          animate={animate}
          className="lg:col-span-2"
          accent="from-indigo-500/15 via-blue-600/10 to-cyan-500/5"
        />

        <HealthScoreBlock metrics={metrics} animate={animate} />

        <MetricBlock
          value={metrics.avgTrustScore}
          label="Average Trust Score"
          description="Mean composite trust score across active projects."
          animate={animate}
          className="lg:col-span-1"
          accent="from-[#1E5BFF]/12 via-indigo-500/5 to-transparent"
        />
        <MetricBlock
          value={metrics.totalHolders}
          label="Total Holders"
          description="Unique wallets holding ecosystem tokens."
          formatValue={formatDashboardCount}
          animate={animate}
          className="lg:col-span-1"
        />
        <MetricBlock
          value={metrics.totalTokensCreated}
          label="Total Tokens Created"
          description="Permissionless launches on OPNChain via FansPump."
          formatValue={formatDashboardCount}
          animate={animate}
          className="lg:col-span-1"
        />
        <MetricBlock
          value={metrics.totalLiquidityUsd}
          label="Total Liquidity"
          description="Aggregate pool depth across tracked pairs."
          formatValue={formatDashboardCurrency}
          animate={animate}
          className="lg:col-span-1"
          accent="from-cyan-500/12 via-[#1E5BFF]/8 to-transparent"
        />
      </div>
    </section>
  );
}
