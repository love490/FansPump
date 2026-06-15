"use client";

import { apiUrl } from "@/lib/api";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useAccount, useSignMessage } from "wagmi";
import { parseEther } from "viem";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InfoTickButton } from "@/components/ui/info-tick-button";
import { cn } from "@/lib/utils";
import {
  LAUNCHPOOL_STAKE_PREFIX,
  LAUNCHPOOL_UNSTAKE_PREFIX,
  launchpoolHeadline,
  type SerializedLaunchpool,
} from "@/lib/launchpool/serialize";
import { formatUnits } from "viem";

type UserStake = {
  id: string;
  assetSymbol: string;
  assetAddress: string | null;
  amount: string;
};

const STATUS_LABELS = {
  ACTIVE: "Active",
  ONGOING: "Ongoing",
  ENDED: "Ended",
} as const;

export function LaunchpoolCard({
  pool,
  onUpdated,
  compact = false,
}: {
  pool: SerializedLaunchpool;
  onUpdated?: () => void;
  compact?: boolean;
}) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [infoOpen, setInfoOpen] = useState(false);
  const [selectedAssetIndex, setSelectedAssetIndex] = useState(0);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [myStakes, setMyStakes] = useState<UserStake[]>([]);

  const selectedAsset = pool.stakeAssets[selectedAssetIndex];
  const canStake = pool.status === "ACTIVE" || pool.status === "ONGOING";
  const myStake = myStakes.find(
    (s) =>
      s.assetSymbol === selectedAsset?.assetSymbol &&
      (s.assetAddress ?? null) === (selectedAsset?.assetAddress ?? null)
  );

  useEffect(() => {
    if (!infoOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setInfoOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [infoOpen]);

  useEffect(() => {
    if (!address) {
      setMyStakes([]);
      return;
    }
    fetch(apiUrl(`/api/launchpool/${pool.id}/stake?wallet=${address.toLowerCase()}`))
      .then((r) => (r.ok ? r.json() : { stakes: [] }))
      .then((data: { stakes?: UserStake[] }) => setMyStakes(data.stakes ?? []))
      .catch(() => setMyStakes([]));
  }, [address, pool.id, loading]);

  async function signAction(prefix: string, detail: string) {
    if (!address) throw new Error("Connect wallet");
    const msg = `${prefix}\nWallet: ${address.toLowerCase()}\nPool: ${pool.id}\nDetail: ${detail}\nTime: ${Date.now()}`;
    const signature = await signMessageAsync({ message: msg });
    return { message: msg, signature };
  }

  async function stake() {
    if (!address || !selectedAsset || !amount) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const amountWei = parseEther(amount).toString();
      const auth = await signAction(
        LAUNCHPOOL_STAKE_PREFIX,
        `${selectedAsset.assetSymbol}:${amountWei}`
      );
      const res = await fetch(apiUrl(`/api/launchpool/${pool.id}/stake`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          assetType: selectedAsset.assetType,
          assetSymbol: selectedAsset.assetSymbol,
          assetAddress: selectedAsset.assetAddress,
          amount: amountWei,
          ...auth,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Stake failed");
      setAmount("");
      setMessage("Staked successfully. Rewards accrue to My Purse after distribution.");
      onUpdated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Stake failed");
    } finally {
      setLoading(false);
    }
  }

  async function unstake() {
    if (!address || !selectedAsset || !myStake) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const unstakeAmount = myStake.amount;
      const auth = await signAction(
        LAUNCHPOOL_UNSTAKE_PREFIX,
        `${selectedAsset.assetSymbol}:${unstakeAmount}`
      );
      const res = await fetch(apiUrl(`/api/launchpool/${pool.id}/stake`), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          assetType: selectedAsset.assetType,
          assetSymbol: selectedAsset.assetSymbol,
          assetAddress: selectedAsset.assetAddress,
          amount: unstakeAmount,
          stakeId: myStake.id,
          ...auth,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Unstake failed");
      setMessage("Unstaked — your tokens are available in your wallet.");
      onUpdated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unstake failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className={cn(compact && "border-primary/20")}>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg">{pool.title}</CardTitle>
              <Badge variant={pool.status === "ENDED" ? "secondary" : "default"}>
                {STATUS_LABELS[pool.status]}
              </Badge>
            </div>
            <CardDescription className="mt-2">{launchpoolHeadline(pool)}</CardDescription>
          </div>
          <div ref={rootRef} className="relative">
            <InfoTickButton
              aria-label="Launchpool details"
              variant="primary"
              onClick={() => setInfoOpen((open) => !open)}
            />
            {infoOpen && (
              <div
                id={panelId}
                role="dialog"
                className="absolute right-0 top-7 z-50 w-80 rounded-lg border border-border bg-card p-4 shadow-lg"
              >
                <p className="text-sm font-semibold">How this launchpool works</p>
                <div className="mt-2 space-y-2 text-xs leading-relaxed text-muted-foreground">
                  <p>{pool.detailInfo}</p>
                  <p>
                    <span className="font-medium text-foreground">Duration:</span>{" "}
                    {pool.durationLabel ??
                      `${new Date(pool.startAt).toLocaleDateString()} – ${new Date(pool.endAt).toLocaleDateString()}`}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Your reward:</span> proportional to
                    your stake vs total pool stake. Earn {pool.rewardTokenSymbol} for free.
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Redeem staked tokens:</span> anytime
                    — unstake whenever you want.
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Claim earnings:</span> rewards are
                    sent to your <Link href="/dashboard" className="text-primary hover:underline">My Purse</Link>{" "}
                    after admin distribution.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{pool.description}</p>
      </CardHeader>

      {!compact && (
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>Reward: {pool.rewardTokenSymbol}</span>
            <span>·</span>
            <span>{pool.participantCount} participants</span>
            <span>·</span>
            <span>Pool ${pool.totalRewardUsd.toLocaleString()}</span>
          </div>

          {canStake && isConnected && (
            <div className="space-y-3 rounded-lg border border-border p-3">
              <Label>Stake asset</Label>
              <div className="flex flex-wrap gap-2">
                {pool.stakeAssets.map((asset, index) => (
                  <Button
                    key={`${asset.assetSymbol}-${asset.assetAddress ?? "native"}`}
                    type="button"
                    size="sm"
                    variant={selectedAssetIndex === index ? "default" : "outline"}
                    onClick={() => setSelectedAssetIndex(index)}
                  >
                    {asset.assetSymbol}
                  </Button>
                ))}
              </div>
              <div className="space-y-2">
                <Label htmlFor={`amount-${pool.id}`}>Amount</Label>
                <Input
                  id={`amount-${pool.id}`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  disabled={loading}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" disabled={loading || !amount} onClick={() => void stake()}>
                  {loading ? "Processing…" : "Stake"}
                </Button>
                {myStake && BigInt(myStake.amount) > 0n && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={loading}
                    onClick={() => void unstake()}
                  >
                    Unstake {formatUnits(BigInt(myStake.amount), 18)} {myStake.assetSymbol}
                  </Button>
                )}
              </div>
            </div>
          )}

          {!isConnected && canStake && (
            <p className="text-sm text-muted-foreground">Connect your wallet to participate.</p>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-emerald-600">{message}</p>}
        </CardContent>
      )}
    </Card>
  );
}
