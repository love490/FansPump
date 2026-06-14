"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMyLiquidityPositions } from "@/hooks/liquidity/useMyLiquidityPositions";
import { useBasePoolLpPositions } from "@/hooks/liquidity/useBasePoolLpPositions";
import { formatActivityAmount } from "@/lib/dashboard/activities";

type StakeRow = {
  id: string;
  stakingType: "OPN" | "LP";
  amount: string;
  tier: string | null;
};

export function DashboardDefiTab() {
  const { address } = useAccount();
  const { positions: lpPositions, loading: lpLoading } = useMyLiquidityPositions(address);
  const { positions: basePools, loading: baseLoading } = useBasePoolLpPositions(address);
  const [stakes, setStakes] = useState<StakeRow[]>([]);
  const [loadingStakes, setLoadingStakes] = useState(false);

  useEffect(() => {
    if (!address) {
      setStakes([]);
      return;
    }
    setLoadingStakes(true);
    fetch(`/api/user/dashboard?wallet=${address.toLowerCase()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setStakes(d?.stakingPositions ?? []))
      .catch(() => setStakes([]))
      .finally(() => setLoadingStakes(false));
  }, [address]);

  const lpRows = useMemo(() => {
    const rows = [
      ...lpPositions
        .filter((p) => !p.pending && p.lpBalance > 0n)
        .map((p) => ({
          id: `lp-${p.lpToken}`,
          label: `${p.tokenSymbol} / ${p.pairLabel}`,
          amount: `${formatUnits(p.lpBalance, p.lpDecimals)} LP`,
          platform: "FansPump",
          href: `/liquidity/${p.tokenAddress}`,
        })),
      ...basePools
        .filter((p) => p.lpBalance > 0n)
        .map((p) => ({
          id: `base-${p.poolId}`,
          label: p.pairLabel,
          amount: `${formatUnits(p.lpBalance, p.lpDecimals)} LP`,
          platform: "OPN Network",
          href: "/my-liquidity",
        })),
    ];
    return rows;
  }, [lpPositions, basePools]);

  const stakeRows = stakes.map((stake) => ({
    id: stake.id,
    label: stake.stakingType === "OPN" ? "OPN stake" : "LP stake",
    amount: formatActivityAmount(stake.amount, 18, stake.stakingType === "OPN" ? "OPN" : "LP"),
    tier: stake.tier,
    href: "/staking",
  }));

  const positionCount = lpRows.length + stakeRows.length;
  const loading = lpLoading || baseLoading || loadingStakes;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total DeFi positions</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">
          {loading ? "…" : String(positionCount)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Liquidity and staking across FansPump and OPN Network.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href="/my-liquidity">Manage liquidity</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/staking">Manage staking</Link>
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

          {stakeRows.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Staked</h3>
              <div className="space-y-2">
                {stakeRows.map((row) => (
                  <Link
                    key={row.id}
                    href={row.href}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-3 transition-colors hover:bg-muted/30"
                  >
                    <div>
                      <p className="font-medium">{row.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {row.amount}
                        {row.tier ? ` · ${row.tier}` : ""}
                      </p>
                    </div>
                    <Badge variant="outline">FansPump</Badge>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
