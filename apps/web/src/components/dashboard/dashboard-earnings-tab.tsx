"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import { Badge } from "@/components/ui/badge";
import { useMyLiquidityPositions } from "@/hooks/liquidity/useMyLiquidityPositions";
import { useBasePoolLpPositions } from "@/hooks/liquidity/useBasePoolLpPositions";
import { formatActivityAmount } from "@/lib/dashboard/activities";

type DashboardApi = {
  stats?: {
    rewardsEarned: string[];
    rewardsEarnedOpn: number;
    questsCompleted: number;
  };
  stakingPositions?: {
    id: string;
    stakingType: "OPN" | "LP";
    amount: string;
    tier: string | null;
  }[];
};

function EarningsSection({
  title,
  href,
  hrefLabel,
  children,
}: {
  title: string;
  href: string;
  hrefLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Link href={href} className="text-xs font-medium text-primary hover:underline">
          {hrefLabel}
        </Link>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export function DashboardEarningsTab() {
  const { address } = useAccount();
  const { positions: lpPositions, loading: lpLoading } = useMyLiquidityPositions(address);
  const { positions: basePools, loading: baseLoading } = useBasePoolLpPositions(address);
  const [data, setData] = useState<DashboardApi | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      setData(null);
      return;
    }
    setLoading(true);
    fetch(`/api/user/dashboard?wallet=${address.toLowerCase()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [address]);

  const liquidityEarnings = useMemo(() => {
    const rows: { id: string; label: string; detail: string; href: string }[] = [];
    for (const p of lpPositions) {
      if (p.pending || p.lpBalance <= 0n) continue;
      rows.push({
        id: `lp-${p.lpToken}`,
        label: `${p.tokenSymbol} / ${p.pairLabel}`,
        detail: `${formatUnits(p.lpBalance, p.lpDecimals)} LP · fee share on FansPump`,
        href: `/liquidity/${p.tokenAddress}`,
      });
    }
    for (const p of basePools) {
      if (p.lpBalance <= 0n) continue;
      rows.push({
        id: `base-${p.poolId}`,
        label: p.pairLabel,
        detail: `${formatUnits(p.lpBalance, p.lpDecimals)} LP · OPN Network pool`,
        href: "/my-liquidity",
      });
    }
    return rows;
  }, [lpPositions, basePools]);

  const stakingRows = data?.stakingPositions ?? [];
  const bountyRewards = data?.stats?.rewardsEarned ?? [];
  const opnEarned = data?.stats?.rewardsEarnedOpn ?? 0;
  const isLoading = loading || lpLoading || baseLoading;
  const hasAny =
    stakingRows.length > 0 || bountyRewards.length > 0 || opnEarned > 0 || liquidityEarnings.length > 0;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Your earnings grouped by source — staking pool share, quest bounties, and liquidity fees.
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading earnings…</p>
      ) : !hasAny ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No earnings yet. Stake on FansPump, complete bounties, or add liquidity to start earning.
        </div>
      ) : (
        <>
          {stakingRows.length > 0 && (
            <EarningsSection title="Staking" href="/staking" hrefLabel="View staking">
              {stakingRows.map((stake) => (
                <Link
                  key={stake.id}
                  href="/staking"
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-3 transition-colors hover:bg-muted/30"
                >
                  <div>
                    <p className="font-medium">
                      {stake.stakingType === "OPN" ? "OPN staked" : "LP staked"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatActivityAmount(stake.amount, 18, stake.stakingType === "OPN" ? "OPN" : "LP")}
                      {stake.tier ? ` · ${stake.tier} tier` : ""}
                    </p>
                  </div>
                  <Badge variant="secondary">FansPump · pool share</Badge>
                </Link>
              ))}
            </EarningsSection>
          )}

          {(bountyRewards.length > 0 || opnEarned > 0) && (
            <EarningsSection title="Bounties" href="/earn" hrefLabel="View bounties">
              {opnEarned > 0 && (
                <Link
                  href="/earn"
                  className="block rounded-lg border border-border px-3 py-3 transition-colors hover:bg-muted/30"
                >
                  <p className="font-medium">Quest rewards</p>
                  <p className="text-sm text-muted-foreground">{opnEarned} OPN earned on FansPump</p>
                </Link>
              )}
              {bountyRewards.map((reward, i) => (
                <Link
                  key={`${reward}-${i}`}
                  href="/earn"
                  className="block rounded-lg border border-border px-3 py-3 transition-colors hover:bg-muted/30"
                >
                  <p className="font-medium">{reward}</p>
                  <p className="text-sm text-muted-foreground">Completed bounty · FansPump</p>
                </Link>
              ))}
            </EarningsSection>
          )}

          {liquidityEarnings.length > 0 && (
            <EarningsSection title="Liquidity" href="/my-liquidity" hrefLabel="Manage liquidity">
              {liquidityEarnings.map((row) => (
                <Link
                  key={row.id}
                  href={row.href}
                  className="block rounded-lg border border-border px-3 py-3 transition-colors hover:bg-muted/30"
                >
                  <p className="font-medium">{row.label}</p>
                  <p className="text-sm text-muted-foreground">{row.detail}</p>
                </Link>
              ))}
            </EarningsSection>
          )}
        </>
      )}
    </div>
  );
}
