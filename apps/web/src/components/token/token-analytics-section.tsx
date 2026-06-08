"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEther } from "viem";

export type TokenAnalytics = {
  volume24h: number;
  volumeTotal: number;
  trades24h: number;
  tradesTotal: number;
  uniqueTraders: number;
  holders: number;
  creatorEarnings: string;
  poolShareValue: string;
  liquidityEstimate: number;
  poolStrength: number;
  lastActivity: string | null;
};

export function TokenAnalyticsSection({ tokenAddress }: { tokenAddress: string }) {
  const [analytics, setAnalytics] = useState<TokenAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/token/${tokenAddress}/analytics`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setAnalytics(d?.analytics ?? null))
      .catch(() => setAnalytics(null))
      .finally(() => setLoading(false));
  }, [tokenAddress]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Loading analytics…</CardContent>
      </Card>
    );
  }

  if (!analytics) return null;

  const creatorEarningsOpn = Number(formatEther(BigInt(analytics.creatorEarnings || "0"))).toFixed(4);
  const poolShareOpn = Number(formatEther(BigInt(analytics.poolShareValue || "0"))).toFixed(4);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">24h volume</dt>
            <dd className="font-semibold tabular-nums">{analytics.volume24h.toFixed(4)} OPN</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Total volume</dt>
            <dd className="font-semibold tabular-nums">{analytics.volumeTotal.toFixed(4)} OPN</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">24h trades</dt>
            <dd className="font-semibold tabular-nums">{analytics.trades24h}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Unique traders</dt>
            <dd className="font-semibold tabular-nums">{analytics.uniqueTraders}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Holders</dt>
            <dd className="font-semibold tabular-nums">{analytics.holders.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Creator earnings</dt>
            <dd className="font-semibold tabular-nums">{creatorEarningsOpn} OPN</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Pool share (simulated)</dt>
            <dd className="font-semibold tabular-nums">{poolShareOpn} OPN</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Pool strength</dt>
            <dd className="font-semibold tabular-nums">{analytics.poolStrength.toFixed(1)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Liquidity estimate</dt>
            <dd className="font-semibold tabular-nums">{analytics.liquidityEstimate.toFixed(1)}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
