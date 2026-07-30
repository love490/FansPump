"use client";

import { apiUrl } from "@/lib/api";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Address } from "viem";
import { formatUnits } from "viem";
import { useActiveWallet } from "@/hooks/useActiveWallet";
import { usePublicClient } from "wagmi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMyLiquidityPositions } from "@/hooks/liquidity/useMyLiquidityPositions";
import { useBasePoolLpPositions } from "@/hooks/liquidity/useBasePoolLpPositions";
import { useWalletPortfolioBalance } from "@/hooks/dashboard/useWalletPortfolioBalance";
import { formatActivityAmount } from "@/lib/dashboard/activities";
import { formatBalanceTotal } from "@/lib/dashboard/wallet-balance";
import { fetchOpnUsdRate, quoteLpTokenUsd } from "@/lib/dashboard/token-quotes";
import {
  launchpoolStakeToActivityRow,
  StakingActivityList,
  type StakingActivityRow,
} from "@/components/staking/staking-activity-list";
import { DashboardLockBurnHistory } from "@/components/dashboard/dashboard-lock-burn-history";
import { liquidityUrl, toolsBurnUrl, toolsLockUrl } from "@/lib/navigation/liquidity-routes";

type StakeRow = {
  id: string;
  stakingType: "OPN" | "LP";
  amount: string;
  tier: string | null;
  asset?: string;
};

type LaunchpoolStakeRow = {
  id: string;
  launchpoolTitle: string;
  assetSymbol: string;
  amount: string;
  stakedAt: string;
};

function launchpoolStakeUsd(amountWei: string, symbol: string, opnRate: number): number {
  try {
    const amount = Number(formatUnits(BigInt(amountWei || "0"), 18));
    const sym = symbol.toUpperCase();
    if (sym === "OPN") return amount * opnRate;
    if (sym === "USDT" || sym === "USDC") return amount;
    return 0;
  } catch {
    return 0;
  }
}

export function DashboardDefiTab() {
  const { walletAddress } = useActiveWallet();
  const client = usePublicClient();
  const { positions: lpPositions, loading: lpLoading } = useMyLiquidityPositions(walletAddress);
  const { positions: basePools, loading: baseLoading } = useBasePoolLpPositions(walletAddress);
  const { opnUsdRate: portfolioRate } = useWalletPortfolioBalance();
  const [stakes, setStakes] = useState<StakeRow[]>([]);
  const [launchpoolStakes, setLaunchpoolStakes] = useState<LaunchpoolStakeRow[]>([]);
  const [loadingStakes, setLoadingStakes] = useState(false);
  const [totalInvestedUsd, setTotalInvestedUsd] = useState<number | null>(null);
  const [valuing, setValuing] = useState(false);

  useEffect(() => {
    if (!walletAddress) {
      setStakes([]);
      setLaunchpoolStakes([]);
      return;
    }
    setLoadingStakes(true);
    fetch(apiUrl(`/api/user/dashboard?wallet=${walletAddress.toLowerCase()}`))
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setStakes(d?.stakingPositions ?? []);
        setLaunchpoolStakes(d?.launchpoolStakes ?? []);
      })
      .catch(() => {
        setStakes([]);
        setLaunchpoolStakes([]);
      })
      .finally(() => setLoadingStakes(false));
  }, [walletAddress]);

  const lpRows = useMemo(() => {
    const rows = [
      ...lpPositions
        .filter((p) => !p.pending && p.lpBalance > 0n)
        .map((p) => ({
          id: `lp-${p.lpToken}`,
          label: `${p.tokenSymbol} / ${p.pairLabel}`,
          amount: `${formatUnits(p.lpBalance, p.lpDecimals)} LP`,
          platform: "FansPump",
          href: liquidityUrl({ tab: "remove", token: p.tokenAddress, pair: p.pairId }),
          lpToken: p.lpToken,
          lpBalance: p.lpBalance,
        })),
      ...basePools
        .filter((p) => p.lpBalance > 0n)
        .map((p) => ({
          id: `base-${p.poolId}`,
          label: p.pairLabel,
          amount: `${formatUnits(p.lpBalance, p.lpDecimals)} LP`,
          platform: "OPN Network",
          href: liquidityUrl({ tab: "remove" }),
          lpToken: p.lpToken,
          lpBalance: p.lpBalance,
        })),
    ];
    return rows;
  }, [lpPositions, basePools]);

  useEffect(() => {
    if (!client || !walletAddress) {
      setTotalInvestedUsd(null);
      return;
    }

    let cancelled = false;
    setValuing(true);

    (async () => {
      const rate = portfolioRate > 0 ? portfolioRate : await fetchOpnUsdRate(client);
      let total = 0;

      for (const stake of stakes) {
        const amountWei = BigInt(stake.amount || "0");
        if (amountWei <= 0n) continue;
        if (stake.stakingType === "OPN") {
          total += Number(formatUnits(amountWei, 18)) * rate;
        } else if (stake.asset) {
          total += await quoteLpTokenUsd(client, stake.asset as Address, amountWei);
        }
      }

      for (const row of lpRows) {
        total += await quoteLpTokenUsd(client, row.lpToken as Address, row.lpBalance);
      }

      for (const stake of launchpoolStakes) {
        total += launchpoolStakeUsd(stake.amount, stake.assetSymbol, rate);
      }

      if (!cancelled) setTotalInvestedUsd(total);
    })()
      .catch(() => {
        if (!cancelled) setTotalInvestedUsd(0);
      })
      .finally(() => {
        if (!cancelled) setValuing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [walletAddress, client, stakes, lpRows, launchpoolStakes, portfolioRate]);

  const stakingActivityRows = useMemo((): StakingActivityRow[] => {
    const poolShare: StakingActivityRow[] = stakes.map((stake) => ({
      id: stake.id,
      label: stake.stakingType === "OPN" ? "OPN stake" : "LP stake",
      amount: formatActivityAmount(stake.amount, 18, stake.stakingType === "OPN" ? "OPN" : "LP"),
      detail: stake.tier ?? undefined,
      href: "/staking",
      badge: "Pool share",
    }));
    const launchpool = launchpoolStakes.map(launchpoolStakeToActivityRow);
    return [...poolShare, ...launchpool];
  }, [stakes, launchpoolStakes]);

  const positionCount = lpRows.length + stakingActivityRows.length;
  const loading = lpLoading || baseLoading || loadingStakes;
  const summaryLoading = loading || valuing;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total invested</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">
          {summaryLoading ? "…" : formatBalanceTotal(totalInvestedUsd ?? 0, "USD")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {summaryLoading
            ? "Calculating liquidity and staking value…"
            : `${positionCount} active position${positionCount === 1 ? "" : "s"} across FansPump and OPN Network.`}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href="/liquidity">Manage liquidity</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/staking">Manage staking</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={toolsLockUrl()}>Lock LP</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={toolsBurnUrl()}>Burn LP</Link>
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading DeFi positions…</p>
      ) : positionCount === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No liquidity or stakes yet. Add liquidity or stake OPN to get started.
        </div>
      ) : (
        <div className="space-y-6">
          {lpRows.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Liquidity</h3>
              <div className="space-y-2">
                {lpRows.map((row) => (
                  <Link
                    key={row.id}
                    href={row.href}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-3 transition-colors hover:bg-muted/30"
                  >
                    <div>
                      <p className="font-medium">{row.label}</p>
                      <p className="text-sm text-muted-foreground">{row.amount}</p>
                    </div>
                    <Badge variant="outline">{row.platform}</Badge>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {stakingActivityRows.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Staking activity</h3>
              <StakingActivityList rows={stakingActivityRows} />
            </section>
          )}
        </div>
      )}

      <DashboardLockBurnHistory walletAddress={walletAddress} />
    </div>
  );
}
