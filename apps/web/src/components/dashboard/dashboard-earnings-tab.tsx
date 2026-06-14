"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { formatUnits } from "viem";
import { Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMyLiquidityPositions } from "@/hooks/liquidity/useMyLiquidityPositions";
import { useBasePoolLpPositions } from "@/hooks/liquidity/useBasePoolLpPositions";
import { useWalletPortfolioBalance } from "@/hooks/dashboard/useWalletPortfolioBalance";
import { formatActivityAmount } from "@/lib/dashboard/activities";
import { formatBalanceTotal } from "@/lib/dashboard/wallet-balance";

type DashboardApi = {
  stats?: {
    rewardsEarned: string[];
    rewardsEarnedOpn: number;
    creatorEarningsOpn: number;
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

const CLAIM_PREFIX = "FansPump Claim Rewards";

export function DashboardEarningsTab() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { opnUsdRate } = useWalletPortfolioBalance();
  const { positions: lpPositions, loading: lpLoading } = useMyLiquidityPositions(address);
  const { positions: basePools, loading: baseLoading } = useBasePoolLpPositions(address);
  const [data, setData] = useState<DashboardApi | null>(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  const load = useCallback(() => {
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

  useEffect(() => {
    load();
  }, [load]);

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
  const creatorEarningsOpn = data?.stats?.creatorEarningsOpn ?? 0;
  const totalRevenueOpn = opnEarned + creatorEarningsOpn;
  const totalRevenueUsd = totalRevenueOpn * (opnUsdRate > 0 ? opnUsdRate : 0.25);
  const isLoading = loading || lpLoading || baseLoading;
  const hasAny =
    stakingRows.length > 0 ||
    bountyRewards.length > 0 ||
    totalRevenueOpn > 0 ||
    liquidityEarnings.length > 0;

  async function claimRewards() {
    if (!address || totalRevenueOpn <= 0) return;
    setClaiming(true);
    setClaimError(null);
    setClaimMessage(null);
    try {
      const message = `${CLAIM_PREFIX}\nWallet: ${address.toLowerCase()}\nAmount: ${totalRevenueOpn} OPN\nTime: ${Date.now()}`;
      const signature = await signMessageAsync({ message });
      const res = await fetch("/api/user/claim-rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          message,
          signature,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) throw new Error(body.error ?? "Claim failed");
      setClaimMessage(body.message ?? "Rewards claim submitted.");
      load();
    } catch (e) {
      setClaimError(e instanceof Error ? e.message : "Claim failed");
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total revenue</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {isLoading ? "…" : formatBalanceTotal(totalRevenueUsd, "USD")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isLoading
                ? "Loading earnings…"
                : totalRevenueOpn > 0
                  ? `${totalRevenueOpn.toLocaleString(undefined, { maximumFractionDigits: 4 })} OPN from bounties and creator fees`
                  : "Complete bounties or earn trading fees to grow your purse."}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={claiming || isLoading || totalRevenueOpn <= 0}
            onClick={() => void claimRewards()}
          >
            <Gift className="mr-1.5 h-4 w-4" />
            {claiming ? "Claiming…" : "Claim rewards"}
          </Button>
        </div>
        {claimMessage && <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">{claimMessage}</p>}
        {claimError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{claimError}</p>}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading My Purse…</p>
      ) : !hasAny ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No earnings yet. Stake on FansPump, complete bounties, or add liquidity to start earning.
        </div>
      ) : (
        <>
          {creatorEarningsOpn > 0 && (
            <EarningsSection title="Creator fees" href="/dashboard" hrefLabel="View tokens">
              <div className="rounded-lg border border-border px-3 py-3">
                <p className="font-medium">Trading fee share</p>
                <p className="text-sm text-muted-foreground">
                  {creatorEarningsOpn.toLocaleString(undefined, { maximumFractionDigits: 4 })} OPN accrued from
                  your tokens
                </p>
              </div>
            </EarningsSection>
          )}

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
