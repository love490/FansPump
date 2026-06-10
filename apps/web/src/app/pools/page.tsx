"use client";

import { useEffect, useState } from "react";
import type { PoolRecord } from "@iopn/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Droplets } from "lucide-react";
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
  const [data, setData] = useState<PoolsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pools")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <BarChart3 className="h-6 w-6" /> Pool Analytics
        </h1>
        <p className="mt-1 text-muted-foreground">
          Read-only liquidity tracking for OPN pairs. AMM math and reward emissions are not active yet.
        </p>
      </header>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Indexed pools", value: data?.analytics.totalPools ?? "—" },
          { label: "Reserve sum", value: data ? shortenReserve(data.analytics.totalLiquidity) : "—" },
          { label: "Volume tracked", value: data ? shortenReserve(data.analytics.totalVolume) : "—" },
          { label: "Providers (est.)", value: data?.analytics.totalProviders ?? "—" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-xl">{loading ? "…" : stat.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5" /> Liquidity pools
          </CardTitle>
          <CardDescription>
            Pools are indexed when liquidity is added or synced from chain. Future AMM integration prep only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading pools…</p>
          ) : !data?.pools.length ? (
            <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              No pools indexed yet. Add liquidity to a token pair to register the first pool.
            </p>
          ) : (
            <div className="space-y-3">
              {data.pools.map((pool) => (
                <div
                  key={pool.poolAddress}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {pool.token0Symbol ?? shortenAddress(pool.token0)} /{" "}
                      {pool.token1Symbol ?? shortenAddress(pool.token1)}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">{pool.poolAddress}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{pool.pairType.replace(/_/g, "/")}</Badge>
                    <span className="text-muted-foreground">
                      Liq: {shortenReserve(pool.totalLiquidity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function shortenReserve(value: string): string {
  try {
    const n = BigInt(value);
    if (n === 0n) return "0";
    if (n > 10n ** 24n) return `${(Number(n) / 1e24).toFixed(2)}e24`;
    if (n > 10n ** 18n) return `${(Number(n) / 1e18).toFixed(4)}`;
    return n.toString();
  } catch {
    return value;
  }
}
