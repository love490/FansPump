"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useBalance, useSignMessage } from "wagmi";
import { formatUnits, parseEther, parseUnits } from "viem";
import { STAKING_TIER_LABELS, STAKING_TIERS, type SupportedLpPool } from "@iopn/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Layers } from "lucide-react";
import { shortenAddress } from "@/lib/utils";
import { useMyLiquidityPositions, type MyLiquidityPosition } from "@/hooks/liquidity/useMyLiquidityPositions";
import {
  useBasePoolLpPositions,
  type BasePoolLpPosition,
} from "@/hooks/liquidity/useBasePoolLpPositions";
import { stakingPositionGroupKey } from "@/lib/staking/position-key";
import { DefiStatsOverview } from "@/components/defi/defi-stats-overview";
import { LaunchpoolStakingTab } from "@/components/launchpool/launchpool-staking-tab";
import { useWalletPortfolioBalance } from "@/hooks/dashboard/useWalletPortfolioBalance";
import { formatReserve, formatTokenAmount } from "@/lib/defi/format-reserve";
import { formatBalanceTotal } from "@/lib/dashboard/wallet-balance";
import { cn } from "@/lib/utils";

type StakingPosition = {
  id: string;
  stakingType: "OPN" | "LP";
  assetType: "OPN" | "LP_TOKEN";
  asset: string;
  amount: string;
  poolAddress: string | null;
  tokenAddress: string | null;
  tier: string | null;
  stakedAt: string;
};

type StakingConfig = {
  opnStakingEnabled: boolean;
  lpStakingEnabled: boolean;
  supportedLpPools: SupportedLpPool[];
  rewardsActive: boolean;
};

type StakeTarget =
  | { kind: "opn" }
  | { kind: "base"; pool: BasePoolLpPosition }
  | { kind: "token"; lp: MyLiquidityPosition };

function lpPositionKey(p: MyLiquidityPosition) {
  return `${p.lpToken}:${p.tokenAddress}:${p.pairId}`;
}

function formatStakeAmount(wei: string, decimals = 18) {
  try {
    return formatUnits(BigInt(wei), decimals);
  } catch {
    return "0";
  }
}

function positionLabel(
  p: StakingPosition,
  tokenLpPositions: MyLiquidityPosition[],
  basePools: BasePoolLpPosition[]
) {
  if (p.stakingType === "OPN") return "OPN";

  const baseMatch = basePools.find((bp) => bp.lpToken.toLowerCase() === p.asset.toLowerCase());
  if (baseMatch) return `${baseMatch.pairLabel} LP`;

  const tokenMatch = tokenLpPositions.find(
    (lp) =>
      lp.lpToken.toLowerCase() === p.asset.toLowerCase() ||
      (p.poolAddress && lp.lpToken.toLowerCase() === p.poolAddress.toLowerCase())
  );
  if (tokenMatch) return `${tokenMatch.tokenSymbol} / ${tokenMatch.pairLabel} LP`;
  return "LP Token";
}

type PlatformStakingStats = {
  activeStakers: number;
  activeStakePositions: number;
  totalStakedOpnWei: string;
  totalStakedLpAmount: string;
  lpStakeCount: number;
};

export default function StakingPage() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { data: nativeBalance } = useBalance({ address });
  const { positions: lpPositions, loading: lpLoading, refresh: refreshLp } = useMyLiquidityPositions(address);
  const { positions: basePoolPositions, loading: basePoolLoading, refresh: refreshBasePools } =
    useBasePoolLpPositions(address);
  const { opnUsdRate } = useWalletPortfolioBalance();

  const [positions, setPositions] = useState<StakingPosition[]>([]);
  const [launchpoolOpnWei, setLaunchpoolOpnWei] = useState(0n);
  const [walletTier, setWalletTier] = useState<string | null>(null);
  const [config, setConfig] = useState<StakingConfig | null>(null);
  const [stakeTarget, setStakeTarget] = useState<StakeTarget>({ kind: "opn" });
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [unstakeAmounts, setUnstakeAmounts] = useState<Record<string, string>>({});
  const [unstakeLoadingId, setUnstakeLoadingId] = useState<string | null>(null);
  const [platformStats, setPlatformStats] = useState<PlatformStakingStats | null>(null);
  const [platformStatsLoading, setPlatformStatsLoading] = useState(true);
  const [pageTab, setPageTab] = useState<"staking" | "launchpool">("staking");

  const walletTokenLpPositions = useMemo(
    () => lpPositions.filter((p) => p.lpToken && p.lpBalance > 0n && !p.pending),
    [lpPositions]
  );

  const groupedPositions = useMemo(() => {
    const map = new Map<string, StakingPosition>();
    for (const p of positions) {
      const key = stakingPositionGroupKey(p);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { ...p });
        continue;
      }
      map.set(key, {
        ...existing,
        amount: (BigInt(existing.amount) + BigInt(p.amount)).toString(),
        stakedAt: existing.stakedAt < p.stakedAt ? existing.stakedAt : p.stakedAt,
      });
    }
    return [...map.values()].sort((a, b) => {
      if (a.stakingType === "OPN") return -1;
      if (b.stakingType === "OPN") return 1;
      return new Date(b.stakedAt).getTime() - new Date(a.stakedAt).getTime();
    });
  }, [positions]);

  const personalStakeTotals = useMemo(() => {
    let opnWei = 0n;
    let lpWei = 0n;
    let lpCount = 0;
    for (const p of groupedPositions) {
      try {
        const amount = BigInt(p.amount || "0");
        if (p.stakingType === "OPN") opnWei += amount;
        else {
          lpWei += amount;
          lpCount += 1;
        }
      } catch {
        /* skip */
      }
    }
    return { opnWei, lpWei, lpCount, positions: groupedPositions.length };
  }, [groupedPositions]);

  useEffect(() => {
    if (walletTokenLpPositions.length === 1) {
      setStakeTarget({ kind: "token", lp: walletTokenLpPositions[0] });
    }
  }, [walletTokenLpPositions]);

  function load() {
    if (!address) return;
    fetch(`/api/staking?wallet=${address}`)
      .then((r) => r.json())
      .then((d) => {
        setPositions(d.positions ?? []);
        setWalletTier(d.walletTier ?? null);
      });
    fetch(`/api/user/dashboard?wallet=${address.toLowerCase()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const lpStakes = (d?.launchpoolStakes ?? []) as { assetSymbol: string; amount: string }[];
        let opn = 0n;
        for (const stake of lpStakes) {
          if (stake.assetSymbol?.toUpperCase() !== "OPN") continue;
          try {
            opn += BigInt(stake.amount || "0");
          } catch {
            /* skip */
          }
        }
        setLaunchpoolOpnWei(opn);
      })
      .catch(() => setLaunchpoolOpnWei(0n));
  }

  useEffect(() => {
    load();
  }, [address]);

  useEffect(() => {
    fetch("/api/staking/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPlatformStats(d))
      .catch(() => setPlatformStats(null))
      .finally(() => setPlatformStatsLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/staking/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setConfig(d?.config ?? null))
      .catch(() => setConfig(null));
  }, []);

  async function signAction(action: string) {
    const prefix = process.env.NEXT_PUBLIC_CREATOR_ACTION_MESSAGE_PREFIX ?? "FansPump Creator Action";
    const message = `${prefix}\n${action}\n${Date.now()}`;
    const signature = await signMessageAsync({ message });
    return { message, signature };
  }

  function setStakeMax() {
    if (stakeTarget.kind === "opn") {
      if (nativeBalance?.value) setAmount(formatUnits(nativeBalance.value, nativeBalance.decimals));
      return;
    }
    if (stakeTarget.kind === "base") {
      setAmount(formatUnits(stakeTarget.pool.lpBalance, stakeTarget.pool.lpDecimals));
      return;
    }
    setAmount(formatUnits(stakeTarget.lp.lpBalance, stakeTarget.lp.lpDecimals));
  }

  async function stake(explicitTarget?: StakeTarget) {
    if (!address || !amount) return;
    const target = explicitTarget ?? stakeTarget;
    setLoading(true);
    try {
      let amountWei: string;
      let asset: string;
      let assetType: "OPN" | "LP_TOKEN";
      let poolAddress: string | undefined;
      let tokenAddress: string | undefined;

      if (target.kind === "opn") {
        amountWei = parseEther(amount).toString();
        asset = "OPN";
        assetType = "OPN";
      } else if (target.kind === "base") {
        const pool = target.pool;
        amountWei = parseUnits(amount, pool.lpDecimals).toString();
        if (BigInt(amountWei) > pool.lpBalance) throw new Error("Amount exceeds wallet LP balance");
        asset = pool.lpToken;
        assetType = "LP_TOKEN";
        poolAddress = pool.lpToken;
      } else {
        const lp = target.lp;
        amountWei = parseUnits(amount, lp.lpDecimals).toString();
        if (BigInt(amountWei) > lp.lpBalance) throw new Error("Amount exceeds wallet LP balance");
        asset = lp.lpToken;
        assetType = "LP_TOKEN";
        poolAddress = lp.lpToken;
        tokenAddress = lp.tokenAddress;
      }

      const auth = await signAction(`Stake ${assetType} ${asset}`);
      const res = await fetch("/api/staking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          assetType,
          asset,
          amount: amountWei,
          poolAddress,
          tokenAddress,
          ...auth,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Stake failed");
      }
      setAmount("");
      load();
      void refreshLp();
      void refreshBasePools();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function setUnstakeMax(position: StakingPosition) {
    setUnstakeAmounts((prev) => ({
      ...prev,
      [stakingPositionGroupKey(position)]: formatStakeAmount(position.amount),
    }));
  }

  async function unstake(position: StakingPosition) {
    if (!address) return;
    const groupKey = stakingPositionGroupKey(position);
    const input = unstakeAmounts[groupKey]?.trim();
    if (!input) return;

    setUnstakeLoadingId(position.id);
    try {
      const amountWei = parseUnits(input, 18).toString();
      if (BigInt(amountWei) <= 0n) return;
      if (BigInt(amountWei) > BigInt(position.amount)) {
        throw new Error("Amount exceeds staked balance");
      }

      const auth = await signAction(`Unstake ${position.id} ${amountWei}`);
      const res = await fetch("/api/staking", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          positionId: position.id,
          amount: amountWei,
          ...auth,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Unstake failed");
      }
      setUnstakeAmounts((prev) => {
        const next = { ...prev };
        delete next[groupKey];
        return next;
      });
      load();
    } catch (e) {
      console.error(e);
    } finally {
      setUnstakeLoadingId(null);
    }
  }

  const opnEnabled = config?.opnStakingEnabled !== false;
  const lpEnabled = config?.lpStakingEnabled !== false;
  const usdcConfigured = Boolean((process.env.NEXT_PUBLIC_USDC_ADDRESS ?? "").trim());

  const opnRate = opnUsdRate > 0 ? opnUsdRate : 0.25;
  const platformOpnUsd = platformStats
    ? Number(formatUnits(BigInt(platformStats.totalStakedOpnWei || "0"), 18)) * opnRate
    : 0;
  const personalOpnWei = personalStakeTotals.opnWei + launchpoolOpnWei;
  const personalOpnUsd = Number(formatUnits(personalOpnWei, 18)) * opnRate;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Layers className="h-6 w-6" /> Staking
        </h1>
        <p className="mt-1 text-muted-foreground">
          Stake OPN, LP tokens, or join Launchpool campaigns to earn project tokens.
        </p>
        <div className="mt-4 flex gap-2">
          {(
            [
              { id: "staking" as const, label: "Pool Share Staking" },
              { id: "launchpool" as const, label: "Launchpool" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPageTab(tab.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
                pageTab === tab.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {pageTab === "staking" && walletTier && (
          <Badge className="mt-3" variant="secondary">
            Your tier: {STAKING_TIER_LABELS[walletTier as keyof typeof STAKING_TIER_LABELS] ?? walletTier}
          </Badge>
        )}
      </header>

      {pageTab === "launchpool" ? (
        <LaunchpoolStakingTab />
      ) : (
        <>

      <DefiStatsOverview
        className="mb-8"
        platformDescription="Total OPN and LP recorded as staked on FansPump."
        personalDescription="Your active stake positions and tier."
        platformLoading={platformStatsLoading}
        platformStats={[
          {
            label: "Total OPN staked",
            value: platformStats
              ? formatTokenAmount(platformStats.totalStakedOpnWei, 18, "OPN")
              : "0 OPN",
            subValue: platformStats
              ? formatBalanceTotal(platformOpnUsd, "USD")
              : undefined,
          },
          {
            label: "Total LP staked",
            value: platformStats
              ? formatReserve(platformStats.totalStakedLpAmount)
              : "0",
            hint: platformStats ? `${platformStats.lpStakeCount} LP stake(s)` : undefined,
          },
          {
            label: "Active stakers",
            value: platformStats ? String(platformStats.activeStakers) : "0",
          },
          {
            label: "Active positions",
            value: platformStats ? String(platformStats.activeStakePositions) : "0",
          },
        ]}
        personalStats={[
          {
            label: "Your OPN staked",
            value: formatTokenAmount(personalOpnWei.toString(), 18, "OPN"),
            subValue: personalOpnWei > 0n ? formatBalanceTotal(personalOpnUsd, "USD") : undefined,
            hint: launchpoolOpnWei > 0n ? "Includes Launchpool OPN" : undefined,
          },
          {
            label: "Your LP staked",
            value:
              personalStakeTotals.lpCount === 0
                ? "None"
                : `${formatReserve(personalStakeTotals.lpWei.toString())} LP`,
            hint:
              personalStakeTotals.lpCount > 0
                ? `${personalStakeTotals.lpCount} LP position(s)`
                : undefined,
          },
          {
            label: "Your stake positions",
            value: String(personalStakeTotals.positions),
          },
          {
            label: "Your tier",
            value: walletTier
              ? STAKING_TIER_LABELS[walletTier as keyof typeof STAKING_TIER_LABELS] ?? walletTier
              : "None",
          },
        ]}
        isConnected={isConnected}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {STAKING_TIERS.map((tier) => (
          <Badge key={tier} variant="outline">
            {STAKING_TIER_LABELS[tier]}
          </Badge>
        ))}
      </div>

      {isConnected && (
        <div className="mb-8 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stake OPN</CardTitle>
              <CardDescription>Native OPN — always available, separate from LP stakes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <StakeAmountRow
                label="Amount (OPN)"
                amount={stakeTarget.kind === "opn" ? amount : ""}
                onAmountChange={(value) => {
                  setStakeTarget({ kind: "opn" });
                  setAmount(value);
                }}
                onMax={() => {
                  setStakeTarget({ kind: "opn" });
                  setStakeMax();
                }}
                onStake={() => void stake({ kind: "opn" })}
                staking={loading && stakeTarget.kind === "opn"}
                disabled={!opnEnabled || loading || !amount}
                stakeLabel={loading && stakeTarget.kind === "opn" ? "Staking…" : "Stake OPN"}
                showStakeButton
              />
              {!opnEnabled && (
                <p className="text-xs text-muted-foreground">OPN staking is currently disabled.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stake OPN / USDT &amp; OPN / USDC LP</CardTitle>
              <CardDescription>
                Base pool LP tokens — independent of project token stakes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {basePoolLoading ? (
                <p className="text-sm text-muted-foreground">Checking OPN/USDT and OPN/USDC LP balances…</p>
              ) : (
                <>
                  <BasePoolStakeRow
                    poolId="opn-usdt"
                    label="OPN/USDT"
                    pool={basePoolPositions.find((p) => p.poolId === "opn-usdt") ?? null}
                    active={stakeTarget.kind === "base" && stakeTarget.pool.poolId === "opn-usdt"}
                    amount={stakeTarget.kind === "base" && stakeTarget.pool.poolId === "opn-usdt" ? amount : ""}
                    onSelect={() => {
                      const pool = basePoolPositions.find((p) => p.poolId === "opn-usdt");
                      if (pool) {
                        setStakeTarget({ kind: "base", pool });
                        setAmount("");
                      }
                    }}
                    onAmountChange={(value) => {
                      const pool = basePoolPositions.find((p) => p.poolId === "opn-usdt");
                      if (pool) {
                        setStakeTarget({ kind: "base", pool });
                        setAmount(value);
                      }
                    }}
                    onMax={() => {
                      const pool = basePoolPositions.find((p) => p.poolId === "opn-usdt");
                      if (pool) {
                        setStakeTarget({ kind: "base", pool });
                        setAmount(formatUnits(pool.lpBalance, pool.lpDecimals));
                      }
                    }}
                    onStake={() => {
                      const pool = basePoolPositions.find((p) => p.poolId === "opn-usdt");
                      if (pool) void stake({ kind: "base", pool });
                    }}
                    staking={loading && stakeTarget.kind === "base" && stakeTarget.pool.poolId === "opn-usdt"}
                    disabled={!lpEnabled || !basePoolPositions.some((p) => p.poolId === "opn-usdt")}
                  />
                  <BasePoolStakeRow
                    poolId="opn-usdc"
                    label="OPN/USDC"
                    pool={basePoolPositions.find((p) => p.poolId === "opn-usdc") ?? null}
                    active={stakeTarget.kind === "base" && stakeTarget.pool.poolId === "opn-usdc"}
                    amount={stakeTarget.kind === "base" && stakeTarget.pool.poolId === "opn-usdc" ? amount : ""}
                    onSelect={() => {
                      const pool = basePoolPositions.find((p) => p.poolId === "opn-usdc");
                      if (pool) {
                        setStakeTarget({ kind: "base", pool });
                        setAmount("");
                      }
                    }}
                    onAmountChange={(value) => {
                      const pool = basePoolPositions.find((p) => p.poolId === "opn-usdc");
                      if (pool) {
                        setStakeTarget({ kind: "base", pool });
                        setAmount(value);
                      }
                    }}
                    onMax={() => {
                      const pool = basePoolPositions.find((p) => p.poolId === "opn-usdc");
                      if (pool) {
                        setStakeTarget({ kind: "base", pool });
                        setAmount(formatUnits(pool.lpBalance, pool.lpDecimals));
                      }
                    }}
                    onStake={() => {
                      const pool = basePoolPositions.find((p) => p.poolId === "opn-usdc");
                      if (pool) void stake({ kind: "base", pool });
                    }}
                    staking={loading && stakeTarget.kind === "base" && stakeTarget.pool.poolId === "opn-usdc"}
                    disabled={!lpEnabled || !usdcConfigured || !basePoolPositions.some((p) => p.poolId === "opn-usdc")}
                    unavailableNote={
                      !usdcConfigured
                        ? "Set NEXT_PUBLIC_USDC_ADDRESS to enable OPN/USDC LP staking."
                        : "No OPN/USDC LP in wallet — add liquidity first."
                    }
                  />
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stake project token LP</CardTitle>
              <CardDescription>LP tokens from your project pairs (OPN, WOPN, or USDT).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {lpLoading ? (
                <p className="text-sm text-muted-foreground">Scanning wallet for token LP…</p>
              ) : walletTokenLpPositions.length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No project token LP found. Add liquidity on a token page, then return here to stake.
                </p>
              ) : walletTokenLpPositions.length === 1 ? (
                <TokenLpStakeBlock
                  lp={walletTokenLpPositions[0]}
                  active={stakeTarget.kind === "token" && lpPositionKey(stakeTarget.lp) === lpPositionKey(walletTokenLpPositions[0])}
                  amount={
                    stakeTarget.kind === "token" &&
                    lpPositionKey(stakeTarget.lp) === lpPositionKey(walletTokenLpPositions[0])
                      ? amount
                      : ""
                  }
                  onFocus={() => {
                    setStakeTarget({ kind: "token", lp: walletTokenLpPositions[0] });
                    setAmount("");
                  }}
                  onAmountChange={(value) => {
                    setStakeTarget({ kind: "token", lp: walletTokenLpPositions[0] });
                    setAmount(value);
                  }}
                  onMax={() => {
                    setStakeTarget({ kind: "token", lp: walletTokenLpPositions[0] });
                    setAmount(formatUnits(walletTokenLpPositions[0].lpBalance, walletTokenLpPositions[0].lpDecimals));
                  }}
                  onStake={() => void stake({ kind: "token", lp: walletTokenLpPositions[0] })}
                  staking={
                    loading &&
                    stakeTarget.kind === "token" &&
                    lpPositionKey(stakeTarget.lp) === lpPositionKey(walletTokenLpPositions[0])
                  }
                  disabled={!lpEnabled}
                />
              ) : (
                <div className="space-y-3">
                  <Label>Select token LP</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={
                      stakeTarget.kind === "token" ? lpPositionKey(stakeTarget.lp) : lpPositionKey(walletTokenLpPositions[0])
                    }
                    onChange={(e) => {
                      const lp = walletTokenLpPositions.find((p) => lpPositionKey(p) === e.target.value);
                      if (lp) {
                        setStakeTarget({ kind: "token", lp });
                        setAmount("");
                      }
                    }}
                  >
                    {walletTokenLpPositions.map((p) => (
                      <option key={lpPositionKey(p)} value={lpPositionKey(p)}>
                        {p.tokenSymbol} / {p.pairLabel} — {formatUnits(p.lpBalance, p.lpDecimals)} LP
                      </option>
                    ))}
                  </select>
                  {stakeTarget.kind === "token" && (
                    <StakeAmountRow
                      label="Amount (LP)"
                      amount={amount}
                      onAmountChange={setAmount}
                      onMax={setStakeMax}
                      onStake={() => {
                        if (stakeTarget.kind === "token") void stake({ kind: "token", lp: stakeTarget.lp });
                      }}
                      staking={loading}
                      disabled={!lpEnabled || loading || !amount}
                      stakeLabel={loading ? "Staking…" : "Stake LP"}
                      showStakeButton
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your stake details</CardTitle>
          <CardDescription>
            One row per asset — additional stakes merge here automatically (up to any number of deposits).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isConnected ? (
            <p className="text-sm text-muted-foreground">Connect wallet to view positions.</p>
          ) : groupedPositions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active stake positions.</p>
          ) : (
            <div className="space-y-3">
              {groupedPositions.map((p) => {
                const groupKey = stakingPositionGroupKey(p);
                const label = positionLabel(p, walletTokenLpPositions, basePoolPositions);
                const stakedDisplay = formatStakeAmount(p.amount);
                return (
                  <div key={groupKey} className="rounded-lg border border-border p-3 text-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">{label}</p>
                        <p className="text-muted-foreground">
                          Staked: {stakedDisplay}
                          {p.stakingType === "OPN" ? " OPN" : " LP"}
                          {" · "}
                          Since {new Date(p.stakedAt).toLocaleDateString()}
                          {p.tier && ` · ${p.tier}`}
                        </p>
                        {p.poolAddress && p.stakingType === "LP" && (
                          <p className="font-mono text-xs text-muted-foreground">
                            Pool {shortenAddress(p.poolAddress)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-end gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <Label className="text-xs">Unstake amount</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => setUnstakeMax(p)}
                          >
                            Max
                          </Button>
                        </div>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={unstakeAmounts[groupKey] ?? ""}
                          onChange={(e) =>
                            setUnstakeAmounts((prev) => ({ ...prev, [groupKey]: e.target.value }))
                          }
                          placeholder="0.0"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={unstakeLoadingId === p.id || !unstakeAmounts[groupKey]?.trim()}
                        onClick={() => unstake(p)}
                      >
                        {unstakeLoadingId === p.id ? "Unstaking…" : "Unstake"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}

function StakeAmountRow({
  label,
  amount,
  onAmountChange,
  onMax,
  onStake,
  staking,
  disabled,
  stakeLabel,
  showStakeButton,
}: {
  label: string;
  amount: string;
  onAmountChange: (value: string) => void;
  onMax: () => void;
  onStake: () => void;
  staking: boolean;
  disabled: boolean;
  stakeLabel: string;
  showStakeButton: boolean;
}) {
  return (
    <>
      <div>
        <div className="flex items-center justify-between gap-2">
          <Label>{label}</Label>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onMax}>
            Max
          </Button>
        </div>
        <Input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          placeholder="0.0"
          className="mt-1"
        />
      </div>
      {showStakeButton && (
        <Button onClick={onStake} disabled={disabled || staking || !amount}>
          {stakeLabel}
        </Button>
      )}
    </>
  );
}

function BasePoolStakeRow({
  label,
  pool,
  active,
  amount,
  onSelect,
  onAmountChange,
  onMax,
  onStake,
  staking,
  disabled,
  unavailableNote,
}: {
  poolId: string;
  label: string;
  pool: BasePoolLpPosition | null;
  active: boolean;
  amount: string;
  onSelect: () => void;
  onAmountChange: (value: string) => void;
  onMax: () => void;
  onStake: () => void;
  staking: boolean;
  disabled: boolean;
  unavailableNote?: string;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${active ? "border-primary/40 bg-primary/5" : "border-border"}`}
      onFocus={onSelect}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{label} LP</p>
          {pool ? (
            <p className="text-sm text-muted-foreground">
              Balance: {formatUnits(pool.lpBalance, pool.lpDecimals)} LP
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">{unavailableNote ?? "No LP in wallet."}</p>
          )}
        </div>
      </div>
      {pool && (
        <div className="mt-3 space-y-3" onClick={onSelect}>
          <StakeAmountRow
            label="Amount (LP)"
            amount={amount}
            onAmountChange={onAmountChange}
            onMax={onMax}
            onStake={onStake}
            staking={staking}
            disabled={disabled}
            stakeLabel={staking ? "Staking…" : `Stake ${label} LP`}
            showStakeButton={active}
          />
        </div>
      )}
    </div>
  );
}

function TokenLpStakeBlock({
  lp,
  active,
  amount,
  onFocus,
  onAmountChange,
  onMax,
  onStake,
  staking,
  disabled,
}: {
  lp: MyLiquidityPosition;
  active: boolean;
  amount: string;
  onFocus: () => void;
  onAmountChange: (value: string) => void;
  onMax: () => void;
  onStake: () => void;
  staking: boolean;
  disabled: boolean;
}) {
  return (
    <div className="space-y-3" onFocus={onFocus}>
      <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
        <p className="font-medium">
          {lp.tokenSymbol} / {lp.pairLabel}
        </p>
        <p className="text-muted-foreground">
          Balance: {formatUnits(lp.lpBalance, lp.lpDecimals)} LP
        </p>
      </div>
      <StakeAmountRow
        label="Amount (LP)"
        amount={amount}
        onAmountChange={onAmountChange}
        onMax={onMax}
        onStake={onStake}
        staking={staking}
        disabled={disabled || staking || !amount}
        stakeLabel={staking ? "Staking…" : "Stake LP"}
        showStakeButton
      />
    </div>
  );
}
