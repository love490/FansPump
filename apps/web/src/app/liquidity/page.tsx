"use client";

import { apiUrl } from "@/lib/api";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { formatLiquidityAmountFromWei } from "@/lib/liquidity/format-amount";
import { AddLiquidityPanel } from "@/components/liquidity/add-liquidity-panel";
import { MyLiquidityList } from "@/components/liquidity/my-liquidity-list";
import { MyLiquidityLockBurn } from "@/components/liquidity/my-liquidity-lock-burn";
import { DefiStatsOverview, StatGrid } from "@/components/defi/defi-stats-overview";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMyLiquidityPositions } from "@/hooks/liquidity/useMyLiquidityPositions";
import { useBasePoolLpPositions } from "@/hooks/liquidity/useBasePoolLpPositions";
import { formatReserve } from "@/lib/defi/format-reserve";

type PoolAnalytics = {
  totalPools: number;
  totalLiquidity: string;
  totalProviders: number;
};

export default function LiquidityPage() {
  const [refreshSeq, setRefreshSeq] = useState(0);
  const [platform, setPlatform] = useState<PoolAnalytics | null>(null);
  const [platformLoading, setPlatformLoading] = useState(true);
  const { address, isConnected } = useAccount();
  const { positions, loading: lpLoading, refresh: refreshLp } = useMyLiquidityPositions(address);
  const { positions: basePools, loading: baseLoading, refresh: refreshBase } =
    useBasePoolLpPositions(address);

  const onLiquidityAdded = useCallback(() => setRefreshSeq((n) => n + 1), []);

  useEffect(() => {
    setPlatformLoading(true);
    fetch(apiUrl("/api/pools"))
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPlatform(d?.analytics ?? null))
      .catch(() => setPlatform(null))
      .finally(() => setPlatformLoading(false));
  }, [refreshSeq]);

  useEffect(() => {
    if (refreshSeq > 0) {
      void refreshLp();
      void refreshBase();
    }
  }, [refreshSeq, refreshLp, refreshBase]);

  const personal = useMemo(() => {
    const tokenLp = positions.filter((p) => !p.pending && p.lpBalance > 0n);
    const baseLp = basePools.filter((p) => p.lpBalance > 0n);
    const lpDisplayParts = [
      ...tokenLp.map(
        (p) =>
          `${formatLiquidityAmountFromWei(p.lpBalance, p.lpDecimals)} ${p.tokenSymbol}/${p.pairLabel}`
      ),
      ...baseLp.map(
        (p) => `${formatLiquidityAmountFromWei(p.lpBalance, p.lpDecimals)} ${p.pairLabel}`
      ),
    ];
    return {
      positionCount: tokenLp.length + baseLp.length,
      lpDisplayParts,
    };
  }, [positions, basePools]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-2 sm:py-4">
      <header>
        <h1 className="text-2xl font-bold">Liquidity</h1>
        <p className="mt-1 text-muted-foreground">
          Add liquidity for any token — paste a contract address, pick from your wallet, and pair with
          OPN, WOPN, or USDT.
        </p>
      </header>

      <DefiStatsOverview
        showPersonal={false}
        platformDescription="Total liquidity indexed across all pools on FansPump."
        platformStats={[
          {
            label: "Total liquidity added",
            value: platform ? formatReserve(platform.totalLiquidity) : "0",
            hint: "Across indexed pools",
          },
          {
            label: "Pools indexed",
            value: platform ? String(platform.totalPools) : "0",
          },
          {
            label: "Providers (est.)",
            value: platform ? String(platform.totalProviders) : "0",
            hint: "Platform-wide",
          },
        ]}
        personalStats={[]}
        platformLoading={platformLoading}
        isConnected={isConnected}
      />

      <Card>
        <CardHeader>
          <CardTitle>Your activity</CardTitle>
          <CardDescription>LP positions and liquidity for your connected wallet.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isConnected ? (
            <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              Connect your wallet to see your liquidity activity.
            </p>
          ) : (
            <StatGrid
              stats={[
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
                      ? "See position details below"
                      : "Add liquidity to get started",
                },
              ]}
              loading={lpLoading || baseLoading}
            />
          )}

          <div className="space-y-3 border-t border-border pt-6">
            <div>
              <h3 className="text-base font-semibold">Your liquidity</h3>
              <p className="text-sm text-muted-foreground">
                Manage each LP position you hold on OPN Network.
              </p>
            </div>
            <MyLiquidityList refreshSeq={refreshSeq} />
          </div>
        </CardContent>
      </Card>

      {isConnected && <MyLiquidityLockBurn positions={positions} />}

      <AddLiquidityPanel showManageLink onLiquidityAdded={onLiquidityAdded} />
    </div>
  );
}
