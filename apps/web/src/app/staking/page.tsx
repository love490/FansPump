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

export default function StakingPage() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { data: nativeBalance } = useBalance({ address });
  const { positions: lpPositions, loading: lpLoading, refresh: refreshLp } = useMyLiquidityPositions(address);

  const [positions, setPositions] = useState<StakingPosition[]>([]);
  const [walletTier, setWalletTier] = useState<string | null>(null);
  const [config, setConfig] = useState<StakingConfig | null>(null);
  const [assetType, setAssetType] = useState<"OPN" | "LP_TOKEN">("OPN");
  const [selectedLpKey, setSelectedLpKey] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [unstakeAmounts, setUnstakeAmounts] = useState<Record<string, string>>({});
  const [unstakeLoadingId, setUnstakeLoadingId] = useState<string | null>(null);

  const walletLpPositions = useMemo(
    () => lpPositions.filter((p) => p.lpToken && p.lpBalance > 0n && !p.pending),
    [lpPositions]
  );

  const selectedLp = useMemo(
    () => walletLpPositions.find((p) => lpPositionKey(p) === selectedLpKey) ?? walletLpPositions[0] ?? null,
    [walletLpPositions, selectedLpKey]
  );

  useEffect(() => {
    if (walletLpPositions.length === 0) {
      setSelectedLpKey("");
      return;
    }
    if (!selectedLpKey || !walletLpPositions.some((p) => lpPositionKey(p) === selectedLpKey)) {
      setSelectedLpKey(lpPositionKey(walletLpPositions[0]));
    }
  }, [walletLpPositions, selectedLpKey]);

  function load() {
    if (!address) return;
    fetch(`/api/staking?wallet=${address}`)
      .then((r) => r.json())
      .then((d) => {
        setPositions(d.positions ?? []);
        setWalletTier(d.walletTier ?? null);
      });
  }

  useEffect(() => {
    load();
  }, [address]);

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
    if (assetType === "OPN") {
      if (nativeBalance?.value) setAmount(formatUnits(nativeBalance.value, nativeBalance.decimals));
      return;
    }
    if (selectedLp) {
      setAmount(formatUnits(selectedLp.lpBalance, selectedLp.lpDecimals));
    }
  }

  async function stake() {
    if (!address || !amount) return;
    setLoading(true);
    try {
      let amountWei: string;
      let asset: string;
      let poolAddress: string | undefined;
      let tokenAddress: string | undefined;

      if (assetType === "OPN") {
        amountWei = parseEther(amount).toString();
        asset = "OPN";
      } else {
        if (!selectedLp?.lpToken) throw new Error("No LP token selected");
        amountWei = parseUnits(amount, selectedLp.lpDecimals).toString();
        if (BigInt(amountWei) > selectedLp.lpBalance) {
          throw new Error("Amount exceeds wallet LP balance");
        }
        asset = selectedLp.lpToken;
        poolAddress = selectedLp.lpToken;
        tokenAddress = selectedLp.tokenAddress;
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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function setUnstakeMax(position: StakingPosition) {
    setUnstakeAmounts((prev) => ({
      ...prev,
      [position.id]: formatStakeAmount(position.amount),
    }));
  }

  async function unstake(position: StakingPosition) {
    if (!address) return;
    const input = unstakeAmounts[position.id]?.trim();
    if (!input) return;

    setUnstakeLoadingId(position.id);
    try {
      const decimals = position.assetType === "OPN" ? 18 : 18;
      const amountWei = parseUnits(input, decimals).toString();
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
        delete next[position.id];
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

  const lpLabelForPosition = (p: StakingPosition) => {
    if (p.stakingType === "OPN") return "OPN";
    const match = walletLpPositions.find(
      (lp) =>
        lp.lpToken.toLowerCase() === p.asset.toLowerCase() ||
        (p.poolAddress && lp.lpToken.toLowerCase() === p.poolAddress.toLowerCase())
    );
    return match ? `LP Token · ${match.tokenSymbol}/${match.pairLabel}` : "LP Token";
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Layers className="h-6 w-6" /> Staking
        </h1>
        <p className="mt-1 text-muted-foreground">
          Stake OPN or LP tokens. Positions are recorded for future visibility boosts and rewards — no emissions or APY yet.
        </p>
        {walletTier && (
          <Badge className="mt-3" variant="secondary">
            Your tier: {STAKING_TIER_LABELS[walletTier as keyof typeof STAKING_TIER_LABELS] ?? walletTier}
          </Badge>
        )}
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {STAKING_TIERS.map((tier) => (
          <Badge key={tier} variant="outline">
            {STAKING_TIER_LABELS[tier]}
          </Badge>
        ))}
      </div>

      <Card className="mb-6 border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Future benefits (config only)</CardTitle>
          <CardDescription>
            Visibility boosts, discovery ranking, and fee discounts are configured by admin but not distributed yet.
          </CardDescription>
        </CardHeader>
      </Card>

      {isConnected && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Stake assets</CardTitle>
            <CardDescription>OPN staking or LP tokens detected in your wallet</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Staking type</Label>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={assetType}
                onChange={(e) => {
                  setAssetType(e.target.value as "OPN" | "LP_TOKEN");
                  setAmount("");
                }}
              >
                <option value="OPN" disabled={!opnEnabled}>
                  OPN {opnEnabled ? "" : "(disabled)"}
                </option>
                <option value="LP_TOKEN" disabled={!lpEnabled}>
                  LP Token {lpEnabled ? "" : "(disabled)"}
                </option>
              </select>
            </div>

            {assetType === "LP_TOKEN" && (
              <div className="space-y-2">
                <Label>LP Token</Label>
                {lpLoading ? (
                  <p className="text-sm text-muted-foreground">Scanning wallet for LP tokens…</p>
                ) : walletLpPositions.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No LP tokens found in your wallet. Add liquidity first, then return here to stake.
                  </p>
                ) : walletLpPositions.length === 1 ? (
                  <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                    <p className="font-medium">
                      {walletLpPositions[0].tokenSymbol} / {walletLpPositions[0].pairLabel}
                    </p>
                    <p className="text-muted-foreground">
                      Balance: {formatUnits(walletLpPositions[0].lpBalance, walletLpPositions[0].lpDecimals)} LP
                    </p>
                  </div>
                ) : (
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selectedLpKey}
                    onChange={(e) => {
                      setSelectedLpKey(e.target.value);
                      setAmount("");
                    }}
                  >
                    {walletLpPositions.map((p) => (
                      <option key={lpPositionKey(p)} value={lpPositionKey(p)}>
                        {p.tokenSymbol} / {p.pairLabel} — {formatUnits(p.lpBalance, p.lpDecimals)} LP
                      </option>
                    ))}
                  </select>
                )}
                {config?.supportedLpPools?.length ? (
                  <p className="text-xs text-muted-foreground">
                    Supported pools: {config.supportedLpPools.map((p) => p.label).join(", ")}
                  </p>
                ) : null}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between gap-2">
                <Label>Amount {assetType === "OPN" ? "(OPN)" : "(LP)"}</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={setStakeMax}
                  disabled={assetType === "LP_TOKEN" && !selectedLp}
                >
                  Max
                </Button>
              </div>
              <Input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="mt-1"
              />
            </div>

            <Button
              onClick={stake}
              disabled={
                loading ||
                !amount ||
                (assetType === "LP_TOKEN" && (!selectedLp || walletLpPositions.length === 0))
              }
            >
              {loading ? "Recording…" : "Record stake"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your positions</CardTitle>
          <CardDescription>Enter an amount to unstake or use Max for the full position.</CardDescription>
        </CardHeader>
        <CardContent>
          {!isConnected ? (
            <p className="text-sm text-muted-foreground">Connect wallet to view positions.</p>
          ) : positions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active stake positions.</p>
          ) : (
            <div className="space-y-3">
              {positions.map((p) => {
                const stakedDisplay = formatStakeAmount(p.amount);
                return (
                  <div
                    key={p.id}
                    className="rounded-lg border border-border p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">{lpLabelForPosition(p)}</p>
                        <p className="text-muted-foreground">
                          Staked: {stakedDisplay}
                          {p.stakingType === "OPN" ? " OPN" : " LP"}
                          {" · "}
                          {new Date(p.stakedAt).toLocaleDateString()}
                          {p.tier && ` · ${p.tier}`}
                        </p>
                        {p.poolAddress && (
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
                          value={unstakeAmounts[p.id] ?? ""}
                          onChange={(e) =>
                            setUnstakeAmounts((prev) => ({ ...prev, [p.id]: e.target.value }))
                          }
                          placeholder="0.0"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={unstakeLoadingId === p.id || !unstakeAmounts[p.id]?.trim()}
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
    </div>
  );
}
