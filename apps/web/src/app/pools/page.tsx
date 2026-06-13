"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import type { PoolRecord } from "@iopn/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddressCopyButton } from "@/components/ui/address-copy-button";
import { DefiStatsOverview } from "@/components/defi/defi-stats-overview";
import { useMyLiquidityPositions } from "@/hooks/liquidity/useMyLiquidityPositions";
import { useBasePoolLpPositions } from "@/hooks/liquidity/useBasePoolLpPositions";
import { formatReserve } from "@/lib/defi/format-reserve";
import { BarChart3, Droplets, Plus, RefreshCw } from "lucide-react";
import { shortenAddress } from "@/lib/utils";

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

export default function PoolsPage() {
  const { address, isConnected } = useAccount();
  const { positions, loading: lpLoading } = useMyLiquidityPositions(address);
  const { positions: basePools, loading: baseLoading } = useBasePoolLpPositions(address);
  const [data, setData] = useState<PoolsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [poolAddress, setPoolAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async (discover = false) => {
    setError(null);
    setLoading(true);
    try {
      const url = discover ? "/api/pools?discover=true" : "/api/pools";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load pools");
      const json = (await res.json()) as PoolsResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pools");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
  }, [load]);

  async function discoverPools() {
    setDiscovering(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/pools/discover", { method: "POST" });
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
      const res = await fetch("/api/pools/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poolAddress: addr }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not add pool");
      setPoolAddress("");
      setMessage(`Pool ${shortenAddress(addr)} indexed.`);
      await load(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add pool");
    } finally {
      setSyncing(false);
    }
  }

  const analytics = data?.analytics;
  const pools = data?.pools ?? [];

  const personal = useMemo(() => {
    const tokenLp = positions.filter((p) => !p.pending && p.lpBalance > 0n);
    const baseLp = basePools.filter((p) => p.lpBalance > 0n);
    const lpDisplayParts = [
      ...tokenLp.map((p) => `${formatUnits(p.lpBalance, p.lpDecimals)} ${p.tokenSymbol}/${p.pairLabel}`),
      ...baseLp.map((p) => `${formatUnits(p.lpBalance, p.lpDecimals)} ${p.pairLabel}`),
    ];
    return {
      positionCount: tokenLp.length + baseLp.length,
      lpDisplayParts,
    };
  }, [positions, basePools]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <BarChart3 className="h-6 w-6" /> Pools
          </h1>
          <p className="mt-1 text-muted-foreground">
            Track liquidity pools across OPN pairs. Discover from chain or add a pool address manually.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={discovering || loading} onClick={() => void discoverPools()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${discovering ? "animate-spin" : ""}`} />
            {discovering ? "Discovering…" : "Discover pools"}
          </Button>
          <Button asChild size="sm">
            <Link href="/discover?section=trending">Browse tokens</Link>
          </Button>
        </div>
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
        platformDescription="Total liquidity and activity across all indexed pools on FansPump."
        personalDescription="Your LP holdings across platform pools."
        platformLoading={loading}
        platformStats={[
          {
            label: "Total liquidity added",
            value: analytics ? formatReserve(analytics.totalLiquidity) : "0",
            hint: "Across indexed pools",
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
        personalStats={[
          {
            label: "Your LP positions",
            value: lpLoading || baseLoading ? "…" : String(personal.positionCount),
          },
          {
            label: "Your liquidity",
            value:
              lpLoading || baseLoading
                ? "…"
                : personal.positionCount === 0
                  ? "None yet"
                  : personal.lpDisplayParts.slice(0, 2).join(" · ") +
                    (personal.lpDisplayParts.length > 2
                      ? ` · +${personal.lpDisplayParts.length - 2} more`
                      : ""),
            hint:
              personal.positionCount > 0
                ? "Manage positions on Liquidity"
                : "Add liquidity to get started",
          },
        ]}
        personalLoading={lpLoading || baseLoading}
        isConnected={isConnected}
        connectMessage="Connect your wallet to see your pool liquidity."
      />

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" /> Add pool
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
          <Button disabled={syncing || !poolAddress.trim()} onClick={() => void addPool()}>
            {syncing ? "Adding…" : "Add pool"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5" /> All pools
          </CardTitle>
          <CardDescription>
            {analytics?.note ??
              "Pools with on-chain liquidity. Add liquidity on a token page to create new pairs."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading pools…</p>
          ) : !pools.length ? (
            <div className="space-y-4 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              <p>No pools indexed yet.</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={discovering} onClick={() => void discoverPools()}>
                  Discover pools from chain
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/create">Create a token</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {pools.map((pool) => (
                <PoolRow key={pool.poolAddress} pool={pool} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PoolRow({ pool }: { pool: PoolRecord }) {
  return (
    <div className="grid gap-3 rounded-lg border border-border p-4 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0 space-y-1">
        <p className="truncate font-medium">
          {pool.token0Symbol ?? shortenAddress(pool.token0, 4)} /{" "}
          {pool.token1Symbol ?? shortenAddress(pool.token1, 4)}
        </p>
        <div className="flex min-w-0 items-center gap-0.5">
          <span
            className="truncate font-mono text-xs text-muted-foreground"
            title={pool.poolAddress}
          >
            {shortenAddress(pool.poolAddress, 4)}
          </span>
          <AddressCopyButton value={pool.poolAddress} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <Badge variant="outline" className="shrink-0">
          {pool.pairType.replace(/_/g, "/")}
        </Badge>
        <span className="shrink-0 font-medium">TVL: {formatReserve(pool.totalLiquidity)}</span>
        <span className="shrink-0 text-muted-foreground">Vol: {formatReserve(pool.totalVolume)}</span>
      </div>
    </div>
  );
}
