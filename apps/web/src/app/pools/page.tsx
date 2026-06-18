"use client";

import { apiUrl, readApiJson } from "@/lib/api";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { PoolRecord } from "@iopn/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AddressCopyButton } from "@/components/ui/address-copy-button";
import { DefiStatsOverview } from "@/components/defi/defi-stats-overview";
import { formatReserve } from "@/lib/defi/format-reserve";
import { BarChart3, Droplets, Plus, Radar, RefreshCw, Search } from "lucide-react";
import { cn, shortenAddress } from "@/lib/utils";

type PoolsResponse = {
  pools: PoolRecord[];
  analytics: {
    totalPools: number;
    totalLiquidity: string;
    totalVolume: string;
    totalProviders: number;
    trackingOnly: boolean;
    note?: string;
  };
};

const SMALL_POOL_TVL = 1;

function poolLabel(pool: PoolRecord): string {
  return `${pool.token0Symbol ?? shortenAddress(pool.token0, 4)} / ${pool.token1Symbol ?? shortenAddress(pool.token1, 4)}`;
}

function poolMatchesQuery(pool: PoolRecord, q: string): boolean {
  const needle = q.toLowerCase();
  return (
    pool.poolAddress.toLowerCase().includes(needle) ||
    pool.token0.toLowerCase().includes(needle) ||
    pool.token1.toLowerCase().includes(needle) ||
    (pool.token0Symbol?.toLowerCase().includes(needle) ?? false) ||
    (pool.token1Symbol?.toLowerCase().includes(needle) ?? false) ||
    poolLabel(pool).toLowerCase().includes(needle)
  );
}

function parseTvl(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function PoolsPage() {
  const [data, setData] = useState<PoolsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [poolAddress, setPoolAddress] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [hideSmallPools, setHideSmallPools] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    setError(null);
    if (opts?.silent) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/pools"));
      const { ok, data, error } = await readApiJson<PoolsResponse & { error?: string }>(res);
      if (!ok) throw new Error(error ?? data.error ?? "Failed to load pools");
      setData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pools");
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function discoverPools() {
    setDiscovering(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(apiUrl("/api/pools/discover"), { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Discover failed");
      setData(json);
      setMessage(`Indexed ${json.syncedCount ?? 0} pool(s) from chain.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Discover failed");
    } finally {
      setDiscovering(false);
    }
  }

  async function addPool() {
    const addr = poolAddress.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      setError("Enter a valid pool address (0x…).");
      return;
    }

    setSyncing(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(apiUrl("/api/pools/sync"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poolAddress: addr }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not add pool");
      setPoolAddress("");
      setMessage(`Pool ${shortenAddress(addr)} indexed.`);
      await load({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add pool");
    } finally {
      setSyncing(false);
    }
  }

  const analytics = data?.analytics;
  const pools = data?.pools ?? [];

  const filteredPools = useMemo(() => {
    const q = searchQuery.trim();
    return pools.filter((pool) => {
      if (hideSmallPools && parseTvl(pool.totalLiquidity) < SMALL_POOL_TVL) return false;
      if (!q) return true;
      return poolMatchesQuery(pool, q);
    });
  }, [pools, searchQuery, hideSmallPools]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <BarChart3 className="h-6 w-6" /> Pools
          </h1>
          <p className="mt-1 text-muted-foreground">
            Browse liquidity pools on OPN Network. Add a new position from Liquidity.
          </p>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link href="/liquidity?tab=add">
            <Plus className="mr-2 h-4 w-4" />
            + New Position
          </Link>
        </Button>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {message}
        </div>
      )}

      <DefiStatsOverview
        className="mb-8"
        showPersonal={false}
        platformDescription="Total liquidity and activity across all indexed pools on FansPump."
        platformLoading={loading}
        platformStats={[
          {
            label: "Total liquidity",
            value: analytics ? formatReserve(analytics.totalLiquidity) : "0",
            hint: "Platform-wide TVL",
          },
          {
            label: "Total pools",
            value: analytics ? String(analytics.totalPools) : "0",
          },
          {
            label: "Volume tracked",
            value: analytics ? formatReserve(analytics.totalVolume) : "0",
          },
          {
            label: "Providers (est.)",
            value: analytics ? String(analytics.totalProviders) : "0",
          },
        ]}
      />

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" /> Index pool
          </CardTitle>
          <CardDescription>
            Paste a swap pair (LP) contract address to index it, or use Discover pools to scan platform tokens.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="pool-address">Pool address</Label>
            <Input
              id="pool-address"
              value={poolAddress}
              onChange={(e) => setPoolAddress(e.target.value)}
              placeholder="0x…"
              className="font-mono text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={syncing || !poolAddress.trim()} onClick={() => void addPool()}>
              {syncing ? "Adding…" : "Add pool"}
            </Button>
            <Button variant="outline" disabled={discovering || loading} onClick={() => void discoverPools()}>
              <Radar className={cn("mr-2 h-4 w-4", discovering && "animate-pulse")} />
              {discovering ? "Discovering…" : "Discover"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Droplets className="h-5 w-5" /> All pools
              </CardTitle>
              <CardDescription>
                {analytics?.note ??
                  "Pools with on-chain liquidity. Use New position to add liquidity on Liquidity."}
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              disabled={loading || refreshing}
              onClick={() => void load({ silent: true })}
              aria-label="Refresh pools"
            >
              <RefreshCw className={cn("h-4 w-4", (loading || refreshing) && "animate-spin")} />
            </Button>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or paste address"
              className="pl-9"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={hideSmallPools} onCheckedChange={(v) => setHideSmallPools(v === true)} />
            Hide small pools
          </label>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading pools…</p>
          ) : !filteredPools.length ? (
            <div className="space-y-4 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              <p>{pools.length ? "No pools match your search." : "No pools indexed yet."}</p>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link href="/liquidity?tab=add">New position</Link>
                </Button>
                <Button size="sm" variant="outline" disabled={discovering} onClick={() => void discoverPools()}>
                  <Radar className="mr-2 h-4 w-4" />
                  Discover pools
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Pool</th>
                    <th className="pb-3 pr-4 font-medium">TVL</th>
                    <th className="pb-3 pr-4 font-medium">Volume</th>
                    <th className="pb-3 font-medium text-right">Providers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredPools.map((pool, index) => (
                    <PoolRow key={pool.poolAddress} pool={pool} rank={index + 1} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PoolRow({ pool, rank }: { pool: PoolRecord; rank: number }) {
  const label = poolLabel(pool);

  return (
    <tr className="align-middle">
      <td className="py-3 pr-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0 text-xs tabular-nums text-muted-foreground">#{rank}</span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{label}</p>
              <Badge variant="outline" className="text-[10px]">
                {pool.pairType.replace(/_/g, "/")}
              </Badge>
            </div>
            <div className="mt-1 flex min-w-0 items-center gap-0.5">
              <span className="truncate font-mono text-xs text-muted-foreground" title={pool.poolAddress}>
                {shortenAddress(pool.poolAddress, 4)}
              </span>
              <AddressCopyButton value={pool.poolAddress} />
            </div>
          </div>
        </div>
      </td>
      <td className="py-3 pr-4 font-medium tabular-nums">{formatReserve(pool.totalLiquidity)}</td>
      <td className="py-3 pr-4 tabular-nums text-muted-foreground">{formatReserve(pool.totalVolume)}</td>
      <td className="py-3 text-right tabular-nums text-muted-foreground">{pool.providerCount}</td>
    </tr>
  );
}
