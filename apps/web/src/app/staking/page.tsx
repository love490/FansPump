"use client";

import { apiUrl } from "@/lib/api";

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
import {
  launchpoolStakeToActivityRow,
  StakingActivityList,
  type StakingActivityRow,
} from "@/components/staking/staking-activity-list";
import { useWalletPortfolioBalance } from "@/hooks/dashboard/useWalletPortfolioBalance";
import { formatReserve, formatTokenAmount } from "@/lib/defi/format-reserve";
import { formatBalanceTotal } from "@/lib/dashboard/wallet-balance";

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

type LpPoolChoice = "opn-usdt" | "opn-usdc" | "project";

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
  const [launchpoolStakes, setLaunchpoolStakes] = useState<
    {
      id: string;
      launchpoolTitle: string;
      assetSymbol: string;
      amount: string;
      stakedAt: string;
    }[]
  >([]);
  const [walletTier, setWalletTier] = useState<string | null>(null);
  const [config, setConfig] = useState<StakingConfig | null>(null);
  const [stakeTarget, setStakeTarget] = useState<StakeTarget>({ kind: "opn" });
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [unstakeAmounts, setUnstakeAmounts] = useState<Record<string, string>>({});
  const [unstakeLoadingId, setUnstakeLoadingId] = useState<string | null>(null);
  const [platformStats, setPlatformStats] = useState<PlatformStakingStats | null>(null);
  const [platformStatsLoading, setPlatformStatsLoading] = useState(true);
  const [lpPoolChoice, setLpPoolChoice] = useState<LpPoolChoice>("opn-usdt");
  const [selectedProjectLpKey, setSelectedProjectLpKey] = useState("");

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

  const selectedProjectLp = useMemo(() => {
    if (walletTokenLpPositions.length === 0) return null;
    if (selectedProjectLpKey) {
      return (
        walletTokenLpPositions.find((p) => lpPositionKey(p) === selectedProjectLpKey) ??
        walletTokenLpPositions[0]
      );
    }
    return walletTokenLpPositions[0];
  }, [walletTokenLpPositions, selectedProjectLpKey]);

  useEffect(() => {
    if (walletTokenLpPositions.length === 0) {
      setSelectedProjectLpKey("");
      return;
    }
    setSelectedProjectLpKey((current) => {
      if (current && walletTokenLpPositions.some((p) => lpPositionKey(p) === current)) {
        return current;
      }
      return lpPositionKey(walletTokenLpPositions[0]);
    });
  }, [walletTokenLpPositions]);

  function load() {
    if (!address) return;
    fetch(apiUrl(`/api/staking?wallet=${address}`))
      .then((r) => r.json())
      .then((d) => {
        setPositions(d.positions ?? []);
        setWalletTier(d.walletTier ?? null);
      });
    fetch(apiUrl(`/api/user/dashboard?wallet=${address.toLowerCase()}`))
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const lpStakes = (d?.launchpoolStakes ?? []) as {
          id: string;
          launchpoolTitle: string;
          assetSymbol: string;
          amount: string;
          stakedAt: string;
        }[];
        setLaunchpoolStakes(lpStakes);
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
      .catch(() => {
        setLaunchpoolStakes([]);
        setLaunchpoolOpnWei(0n);
      });
  }

  useEffect(() => {
    load();
  }, [address]);

  useEffect(() => {
    fetch(apiUrl("/api/staking/stats"))
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPlatformStats(d))
      .catch(() => setPlatformStats(null))
      .finally(() => setPlatformStatsLoading(false));
  }, []);

  useEffect(() => {
    fetch(apiUrl("/api/staking/config"))
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
      const res = await fetch(apiUrl("/api/staking"), {
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
      const res = await fetch(apiUrl("/api/staking"), {
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

  const stakingActivityRows = useMemo((): StakingActivityRow[] => {
    const poolShare: StakingActivityRow[] = groupedPositions.map((p) => {
      const label = positionLabel(p, walletTokenLpPositions, basePoolPositions);
      const stakedDisplay = formatStakeAmount(p.amount);
      return {
        id: `pool-${stakingPositionGroupKey(p)}`,
        label,
        amount: `${stakedDisplay} ${p.stakingType === "OPN" ? "OPN" : "LP"}`,
        detail: `Since ${new Date(p.stakedAt).toLocaleDateString()}${p.tier ? ` · ${p.tier}` : ""}`,
        href: "/staking",
        badge: "Pool share",
      };
    });
    const launchpool = launchpoolStakes.map(launchpoolStakeToActivityRow);
    return [...poolShare, ...launchpool];
  }, [groupedPositions, launchpoolStakes, walletTokenLpPositions, basePoolPositions]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Layers className="h-6 w-6" /> Staking
        </h1>
        <p className="mt-1 text-muted-foreground">
          Stake OPN or LP tokens to earn pool share rewards.
        </p>
        {walletTier && (
          <Badge className="mt-3" variant="secondary">
            Your tier: {STAKING_TIER_LABELS[walletTier as keyof typeof STAKING_TIER_LABELS] ?? walletTier}
          </Badge>
        )}
      </header>

      <DefiStatsOverview
        className="mb-8"
        platformDescription="Total OPN and LP recorded as staked on FansPump."
        personalTitle="Your totals"
        personalDescription="Combined OPN, LP, and tier from pool share and Launchpool stakes."
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
            value: String(personalStakeTotals.positions + launchpoolStakes.length),
            hint:
              launchpoolStakes.length > 0
                ? `${launchpoolStakes.length} Launchpool · ${personalStakeTotals.positions} pool share`
                : undefined,
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

          <LpStakeCard
            lpPoolChoice={lpPoolChoice}
            onLpPoolChoiceChange={(choice) => {
              setLpPoolChoice(choice);
              setAmount("");
              if (choice === "opn-usdt") {
                const pool = basePoolPositions.find((p) => p.poolId === "opn-usdt");
                if (pool) setStakeTarget({ kind: "base", pool });
              } else if (choice === "opn-usdc") {
                const pool = basePoolPositions.find((p) => p.poolId === "opn-usdc");
                if (pool) setStakeTarget({ kind: "base", pool });
              } else if (selectedProjectLp) {
                setStakeTarget({ kind: "token", lp: selectedProjectLp });
              }
            }}
            basePoolLoading={basePoolLoading}
            lpLoading={lpLoading}
            basePoolPositions={basePoolPositions}
            walletTokenLpPositions={walletTokenLpPositions}
            selectedProjectLpKey={selectedProjectLpKey}
            onSelectedProjectLpKeyChange={(key) => {
              setSelectedProjectLpKey(key);
              setAmount("");
              const lp = walletTokenLpPositions.find((p) => lpPositionKey(p) === key);
              if (lp) setStakeTarget({ kind: "token", lp });
            }}
            selectedProjectLp={selectedProjectLp}
            amount={amount}
            onAmountChange={(value) => {
              if (lpPoolChoice === "project" && selectedProjectLp) {
                setStakeTarget({ kind: "token", lp: selectedProjectLp });
              } else if (lpPoolChoice === "opn-usdt") {
                const pool = basePoolPositions.find((p) => p.poolId === "opn-usdt");
                if (pool) setStakeTarget({ kind: "base", pool });
              } else {
                const pool = basePoolPositions.find((p) => p.poolId === "opn-usdc");
                if (pool) setStakeTarget({ kind: "base", pool });
              }
              setAmount(value);
            }}
            onMax={() => {
              if (lpPoolChoice === "project" && selectedProjectLp) {
                setStakeTarget({ kind: "token", lp: selectedProjectLp });
                setAmount(
                  formatUnits(selectedProjectLp.lpBalance, selectedProjectLp.lpDecimals)
                );
                return;
              }
              if (lpPoolChoice === "opn-usdt") {
                const pool = basePoolPositions.find((p) => p.poolId === "opn-usdt");
                if (pool) {
                  setStakeTarget({ kind: "base", pool });
                  setAmount(formatUnits(pool.lpBalance, pool.lpDecimals));
                }
                return;
              }
              const pool = basePoolPositions.find((p) => p.poolId === "opn-usdc");
              if (pool) {
                setStakeTarget({ kind: "base", pool });
                setAmount(formatUnits(pool.lpBalance, pool.lpDecimals));
              }
            }}
            onStake={() => {
              if (lpPoolChoice === "project" && selectedProjectLp) {
                void stake({ kind: "token", lp: selectedProjectLp });
                return;
              }
              if (lpPoolChoice === "opn-usdt") {
                const pool = basePoolPositions.find((p) => p.poolId === "opn-usdt");
                if (pool) void stake({ kind: "base", pool });
                return;
              }
              const pool = basePoolPositions.find((p) => p.poolId === "opn-usdc");
              if (pool) void stake({ kind: "base", pool });
            }}
            staking={loading && stakeTarget.kind !== "opn"}
            disabled={!lpEnabled}
            usdcConfigured={usdcConfigured}
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your activity</CardTitle>
          <CardDescription>
            All active stakes — pool share staking and Launchpool (OPN, USDT, USDC, project tokens).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isConnected ? (
            <p className="text-sm text-muted-foreground">Connect wallet to view positions.</p>
          ) : (
            <StakingActivityList
              rows={stakingActivityRows}
              emptyMessage="No active staking positions. Stake OPN/LP or join a Launchpool."
            />
          )}
        </CardContent>
      </Card>

      {groupedPositions.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle>Manage pool share stakes</CardTitle>
          <CardDescription>
            Unstake pool share positions — additional deposits merge into one row per asset.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
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

function LpStakeCard({
  lpPoolChoice,
  onLpPoolChoiceChange,
  basePoolLoading,
  lpLoading,
  basePoolPositions,
  walletTokenLpPositions,
  selectedProjectLpKey,
  onSelectedProjectLpKeyChange,
  selectedProjectLp,
  amount,
  onAmountChange,
  onMax,
  onStake,
  staking,
  disabled,
  usdcConfigured,
}: {
  lpPoolChoice: LpPoolChoice;
  onLpPoolChoiceChange: (choice: LpPoolChoice) => void;
  basePoolLoading: boolean;
  lpLoading: boolean;
  basePoolPositions: BasePoolLpPosition[];
  walletTokenLpPositions: MyLiquidityPosition[];
  selectedProjectLpKey: string;
  onSelectedProjectLpKeyChange: (key: string) => void;
  selectedProjectLp: MyLiquidityPosition | null;
  amount: string;
  onAmountChange: (value: string) => void;
  onMax: () => void;
  onStake: () => void;
  staking: boolean;
  disabled: boolean;
  usdcConfigured: boolean;
}) {
  const opnUsdtPool = basePoolPositions.find((p) => p.poolId === "opn-usdt") ?? null;
  const opnUsdcPool = basePoolPositions.find((p) => p.poolId === "opn-usdc") ?? null;

  const lpBalance =
    lpPoolChoice === "project" && selectedProjectLp
      ? { value: selectedProjectLp.lpBalance, decimals: selectedProjectLp.lpDecimals }
      : lpPoolChoice === "opn-usdt" && opnUsdtPool
        ? { value: opnUsdtPool.lpBalance, decimals: opnUsdtPool.lpDecimals }
        : lpPoolChoice === "opn-usdc" && opnUsdcPool
          ? { value: opnUsdcPool.lpBalance, decimals: opnUsdcPool.lpDecimals }
          : null;

  const balanceLabel =
    lpPoolChoice === "project" && selectedProjectLp
      ? `${selectedProjectLp.tokenSymbol} / ${selectedProjectLp.pairLabel}`
      : lpPoolChoice === "opn-usdt"
        ? "OPN/USDT"
        : "OPN/USDC";

  const emptyMessage =
    lpPoolChoice === "project"
      ? "No project token LP found. Add liquidity on a token page, then return here to stake."
      : lpPoolChoice === "opn-usdc" && !usdcConfigured
        ? "Set NEXT_PUBLIC_USDC_ADDRESS to enable OPN/USDC LP staking."
        : `No ${balanceLabel} LP in wallet — add liquidity first.`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stake LP</CardTitle>
        <CardDescription>OPN/USDT, OPN/USDC, or project token pair LP.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {basePoolLoading || lpLoading ? (
          <p className="text-sm text-muted-foreground">Checking wallet LP balances…</p>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="lp-pool-choice">LP pool</Label>
              <select
                id="lp-pool-choice"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={lpPoolChoice}
                onChange={(e) => onLpPoolChoiceChange(e.target.value as LpPoolChoice)}
              >
                <option value="opn-usdt">OPN/USDT LP</option>
                <option value="opn-usdc" disabled={!usdcConfigured}>
                  OPN/USDC LP
                </option>
                <option value="project">Project pair LP</option>
              </select>
            </div>

            {lpPoolChoice === "project" && walletTokenLpPositions.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="project-lp-choice">Project pair</Label>
                <select
                  id="project-lp-choice"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedProjectLpKey}
                  onChange={(e) => onSelectedProjectLpKeyChange(e.target.value)}
                >
                  {walletTokenLpPositions.map((p) => (
                    <option key={lpPositionKey(p)} value={lpPositionKey(p)}>
                      {p.tokenSymbol} / {p.pairLabel} — {formatUnits(p.lpBalance, p.lpDecimals)} LP
                    </option>
                  ))}
                </select>
              </div>
            )}

            {lpBalance ? (
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                <p className="font-medium">{balanceLabel}</p>
                <p className="text-muted-foreground">
                  Balance: {formatUnits(lpBalance.value, lpBalance.decimals)} LP
                </p>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                {emptyMessage}
              </p>
            )}

            {lpBalance && (
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
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
