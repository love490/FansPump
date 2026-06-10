"use client";

import { useState } from "react";
import { useReadContract } from "wagmi";
import { KeyRound, Loader2 } from "lucide-react";
import { TOKEN_FEATURES, hasFeature } from "@iopn/shared";
import { tokenAbi } from "@/lib/abis/factory";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTokenLiquidityStats } from "@/hooks/liquidity/useTokenLiquidityStats";
import { LiquidityMetricBar } from "@/components/liquidity/liquidity-metric-bar";
import { InfoTickButton } from "@/components/ui/info-tick-button";
import { shortenAddress, cn } from "@/lib/utils";

type TokenLiquidityOverviewProps = {
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals?: number;
  featureFlags?: number;
};

export function TokenLiquidityOverview({
  tokenAddress,
  tokenSymbol,
  tokenDecimals = 18,
  featureFlags = 0,
}: TokenLiquidityOverviewProps) {
  const { stats, loading } = useTokenLiquidityStats(tokenAddress, tokenDecimals);
  const [lockInfoOpen, setLockInfoOpen] = useState(false);
  const [tradableInfoOpen, setTradableInfoOpen] = useState(false);
  const hasTradingSwitch = hasFeature(featureFlags, TOKEN_FEATURES.TRADING_SWITCH);

  const { data: tradingEnabled } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: tokenAbi,
    functionName: "tradingEnabled",
    query: { enabled: hasTradingSwitch },
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed p-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading liquidity…
      </div>
    );
  }

  if (!stats || stats.pairs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No liquidity pools yet</CardTitle>
          <CardDescription>
            This token has no active OPN or USDT pairs on the DEX.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const maxLocked = Math.max(...stats.pairs.map((p) => p.lockedPct));
  const maxBurned = Math.max(...stats.pairs.map((p) => p.burnedPct));
  const topBurnedPair = stats.pairs.reduce(
    (best, p) => (p.burnedPct > best.burnedPct ? p : best),
    stats.pairs[0]
  );
  const topLockedPair = stats.pairs.reduce(
    (best, p) => (p.lockedPct > best.lockedPct ? p : best),
    stats.pairs[0]
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Pool liquidity</CardTitle>
          <CardDescription>
            Total liquidity across {tokenSymbol} trading pairs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats.pairs.map((p) => (
            <div
              key={p.pairId}
              className="rounded-xl border border-border/60 bg-muted/20 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  {tokenSymbol} / {p.label}
                </p>
              </div>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {shortenAddress(p.pairAddress, 6)}
              </p>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">{tokenSymbol} in pool</p>
                  <p className="font-mono font-semibold">{p.tokenReserve}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{p.quoteSymbol} in pool</p>
                  <p className="font-mono font-semibold">{p.quoteReserve}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-muted-foreground">TVL ({p.quoteSymbol})</p>
                  <p className="font-mono font-semibold">{p.tvlQuote} {p.quoteSymbol}</p>
                </div>
              </div>
            </div>
          ))}

          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm text-muted-foreground">Total liquidity (USDT pairs)</p>
            <p className="text-2xl font-bold tabular-nums">{stats.totalUsdtEstimate} USDT</p>
          </div>
        </CardContent>
      </Card>

      {hasTradingSwitch && (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              Tradable
              <span className={cn("text-base font-semibold", tradingEnabled ? "text-green-600" : "text-amber-600")}>
                {tradingEnabled ? "Yes" : "No"}
              </span>
              <InfoTickButton
                aria-label="Tradable info"
                size="md"
                variant={tradingEnabled ? "success" : "warning"}
                onClick={() => setTradableInfoOpen((o) => !o)}
              />
            </CardTitle>
          </CardHeader>
          {tradableInfoOpen && (
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Tradable enable switch {tradingEnabled ? "active" : "inactive"}.
              </p>
            </CardContent>
          )}
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Burnable &amp; locked
            <button
              type="button"
              onClick={() => setLockInfoOpen((o) => !o)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground hover:bg-muted"
              aria-label="Liquidity lock info"
            >
              <KeyRound className="h-4 w-4" />
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent className="min-w-0 space-y-4 overflow-hidden">
          <LiquidityMetricBar
            label="Burned liquidity"
            amount={topBurnedPair.burnedLpAmount}
            pct={topBurnedPair.burnedPct}
            variant="burn"
          />
          <LiquidityMetricBar
            label="Locked liquidity"
            amount={topLockedPair.lockedLpAmount}
            pct={topLockedPair.lockedPct}
            variant="lock"
          />

          {stats.pairs.length > 1 && (
            <div className="space-y-3 border-t border-border/60 pt-3">
              {stats.pairs.map((p) => (
                <div key={p.pairId} className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    {tokenSymbol} / {p.label}
                  </p>
                  <LiquidityMetricBar
                    label="Burned"
                    amount={p.burnedLpAmount}
                    pct={p.burnedPct}
                    variant="burn"
                  />
                  <LiquidityMetricBar
                    label="Locked"
                    amount={p.lockedLpAmount}
                    pct={p.lockedPct}
                    variant="lock"
                  />
                </div>
              ))}
            </div>
          )}

          {lockInfoOpen && (
            <p className="rounded-lg border border-border/60 bg-muted/30 p-3 text-muted-foreground">
              {stats.fullySecured
                ? "100% locked and burned"
                : `${maxLocked.toFixed(2)}% locked and ${maxBurned.toFixed(2)}% burned`}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
