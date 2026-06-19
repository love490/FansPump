"use client";

import Link from "next/link";
import type { PoolRecord } from "@iopn/shared";
import { Badge } from "@/components/ui/badge";
import { AddressCopyButton } from "@/components/ui/address-copy-button";
import { formatReserve } from "@/lib/defi/format-reserve";
import {
  formatApr,
  formatPoolMetricDisplay,
  poolApr24h,
  poolFees24h,
  poolMetricLabel,
  poolVolume24h,
  type PoolMetricFilter,
} from "@/lib/pools/pool-display-metrics";
import { cn, shortenAddress } from "@/lib/utils";

function poolLabel(pool: PoolRecord): string {
  return `${pool.token0Symbol ?? shortenAddress(pool.token0, 4)} / ${pool.token1Symbol ?? shortenAddress(pool.token1, 4)}`;
}

function PoolNameCell({ pool, rank }: { pool: PoolRecord; rank?: number }) {
  const label = poolLabel(pool);
  return (
    <div className="flex items-start gap-2 sm:gap-3">
      {rank != null && (
        <span className="mt-0.5 shrink-0 text-xs tabular-nums text-muted-foreground">#{rank}</span>
      )}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <p className="truncate font-semibold">{label}</p>
          <Badge variant="outline" className="hidden text-[10px] sm:inline-flex">
            {pool.pairType.replace(/_/g, "/")}
          </Badge>
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-0.5 sm:mt-1">
          <span className="truncate font-mono text-[10px] text-muted-foreground sm:text-xs" title={pool.poolAddress}>
            {shortenAddress(pool.poolAddress, 4)}
          </span>
          <AddressCopyButton value={pool.poolAddress} />
        </div>
      </div>
    </div>
  );
}

export function PoolsMobileTable({
  pools,
  metric,
}: {
  pools: PoolRecord[];
  metric: PoolMetricFilter;
}) {
  const metricHeader = poolMetricLabel(metric);

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          <th className="pb-2 pr-2 font-medium">Pool</th>
          <th className="pb-2 pr-2 text-right font-medium">{metricHeader}</th>
          <th className="pb-2 text-right font-medium">APR 24HR</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {pools.map((pool, index) => (
          <tr key={pool.poolAddress} className="align-middle">
            <td className="py-2.5 pr-2">
              <PoolNameCell pool={pool} rank={index + 1} />
            </td>
            <td className="py-2.5 pr-2 text-right tabular-nums text-muted-foreground">
              {formatPoolMetricDisplay(pool, metric)}
            </td>
            <td className="py-2.5 text-right tabular-nums font-medium">
              {formatApr(poolApr24h(pool))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function PoolsDesktopTable({ pools }: { pools: PoolRecord[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="pb-3 pr-4 font-medium">Pool</th>
            <th className="pb-3 pr-4 font-medium">TVL</th>
            <th className="pb-3 pr-4 font-medium">Vol 24H</th>
            <th className="pb-3 pr-4 font-medium">Fees 24H</th>
            <th className="pb-3 pr-4 font-medium">APR 24HR</th>
            <th className="pb-3 text-right font-medium">Providers</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {pools.map((pool, index) => (
            <tr key={pool.poolAddress} className="align-middle">
              <td className="py-3 pr-4">
                <PoolNameCell pool={pool} rank={index + 1} />
              </td>
              <td className="py-3 pr-4 font-medium tabular-nums">{formatReserve(pool.totalLiquidity)}</td>
              <td className="py-3 pr-4 tabular-nums text-muted-foreground">
                {formatReserve(String(poolVolume24h(pool)))}
              </td>
              <td className="py-3 pr-4 tabular-nums text-muted-foreground">
                {formatReserve(String(poolFees24h(pool)))}
              </td>
              <td className="py-3 pr-4 tabular-nums font-medium">{formatApr(poolApr24h(pool))}</td>
              <td className="py-3 text-right tabular-nums text-muted-foreground">{pool.providerCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StablePoolsSection({ pools }: { pools: PoolRecord[] }) {
  if (!pools.length) return null;

  return (
    <section className="mb-8 hidden md:block">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Stable</h2>
          <p className="text-sm text-muted-foreground">USDT and USDC base pools for quick liquidity access.</p>
        </div>
        <Link href="/liquidity?tab=add" className="text-sm font-medium text-primary hover:underline">
          Add liquidity
        </Link>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <PoolsDesktopTable pools={pools} />
      </div>
    </section>
  );
}

export function CompactSelect({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <label className={cn("flex min-w-0 flex-1 flex-col gap-1", className)}>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-lg border border-border bg-background px-2 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/30"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
