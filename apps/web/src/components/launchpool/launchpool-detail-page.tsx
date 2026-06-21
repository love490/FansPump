"use client";

import { apiUrl } from "@/lib/api";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAccount, useSignMessage } from "wagmi";
import { formatUnits, parseEther } from "viem";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignInModal } from "@/components/auth/sign-in-modal";
import { cn } from "@/lib/utils";
import { useRequireSignIn } from "@/hooks/useRequireSignIn";
import {
  LAUNCHPOOL_STAKE_PREFIX,
  LAUNCHPOOL_UNSTAKE_PREFIX,
  assetKey,
  formatLaunchpoolPrize,
  formatUtcRange,
  type SerializedLaunchpool,
} from "@/lib/launchpool/serialize";

type UserStake = {
  id: string;
  assetSymbol: string;
  assetAddress: string | null;
  amount: string;
};

type DetailTab = "pools" | "info";

const STATUS_LABELS = {
  ACTIVE: "Active",
  ONGOING: "Ongoing",
  ENDED: "Ended",
} as const;

function ProjectAvatar({ title }: { title: string }) {
  const letter = title.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/20 text-lg font-bold text-primary">
      {letter}
    </div>
  );
}

function formatTokenWei(wei: string): string {
  try {
    return Number(formatUnits(BigInt(wei || "0"), 18)).toLocaleString(undefined, {
      maximumFractionDigits: 4,
    });
  } catch {
    return wei;
  }
}

export function LaunchpoolDetailPage({ poolId }: { poolId: string }) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { canParticipate, signInOpen, setSignInOpen } = useRequireSignIn();
  const [pool, setPool] = useState<SerializedLaunchpool | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<DetailTab>("pools");
  const [selectedAssetKey, setSelectedAssetKey] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [myStakes, setMyStakes] = useState<UserStake[]>([]);

  const loadPool = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(apiUrl(`/api/launchpool/${poolId}`))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Not found"))))
      .then((data: { pool?: SerializedLaunchpool }) => setPool(data.pool ?? null))
      .catch(() => setError("Launchpool not found."))
      .finally(() => setLoading(false));
  }, [poolId]);

  useEffect(() => {
    loadPool();
  }, [loadPool]);

  useEffect(() => {
    if (!address) {
      setMyStakes([]);
      return;
    }
    fetch(apiUrl(`/api/launchpool/${poolId}/stake?wallet=${address.toLowerCase()}`))
      .then((r) => (r.ok ? r.json() : { stakes: [] }))
      .then((data: { stakes?: UserStake[] }) => setMyStakes(data.stakes ?? []))
      .catch(() => setMyStakes([]));
  }, [address, poolId, actionLoading]);

  const selectedAsset = pool?.stakeAssets.find((a) => assetKey(a) === selectedAssetKey) ?? null;
  const canStake = pool?.status === "ACTIVE" || pool?.status === "ONGOING";
  const myStake = selectedAsset
    ? myStakes.find(
        (s) =>
          s.assetSymbol === selectedAsset.assetSymbol &&
          (s.assetAddress ?? null) === (selectedAsset.assetAddress ?? null)
      )
    : undefined;

  async function signAction(prefix: string, detail: string) {
    if (!address || !pool) throw new Error("Connect wallet");
    const msg = `${prefix}\nWallet: ${address.toLowerCase()}\nPool: ${pool.id}\nDetail: ${detail}\nTime: ${Date.now()}`;
    const signature = await signMessageAsync({ message: msg });
    return { message: msg, signature };
  }

  async function stake() {
    if (!address || !selectedAsset || !amount || !pool) return;
    setActionLoading(true);
    setActionError(null);
    setActionMessage(null);
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
      setActionMessage("Staked successfully.");
      loadPool();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Stake failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function unstake() {
    if (!address || !selectedAsset || !myStake || !pool) return;
    setActionLoading(true);
    setActionError(null);
    setActionMessage(null);
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
      setActionMessage("Unstaked — your tokens are available in your wallet.");
      loadPool();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Unstake failed");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading launchpool…</p>;
  }

  if (error || !pool) {
    return (
      <div className="space-y-4">
        <Link href="/launchpool" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Launchpool
        </Link>
        <p className="text-sm text-red-600">{error ?? "Launchpool not found."}</p>
      </div>
    );
  }

  const prizeLabel = `Prize Pool (${pool.rewardTokenSymbol})`;
  const minLabel =
    BigInt(pool.minStakeAmount || "0") > 0n
      ? formatTokenWei(pool.minStakeAmount)
      : null;
  const maxLabel = pool.maxStakeAmount ? formatTokenWei(pool.maxStakeAmount) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/launchpool"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-lg font-semibold">Details</h1>
      </div>

      <Card className="border-border/80 bg-card/80">
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <ProjectAvatar title={pool.title} />
              <div>
                <p className="text-xl font-bold">{pool.title}</p>
                <p className="text-sm text-muted-foreground">{pool.description}</p>
              </div>
            </div>
            <Badge variant={pool.status === "ENDED" ? "secondary" : "default"}>
              {STATUS_LABELS[pool.status]}
            </Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">{prizeLabel}</p>
              <p className="text-lg font-semibold">{formatLaunchpoolPrize(pool)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Event Duration</p>
              <p className="text-lg font-semibold">{pool.durationLabel ?? "—"}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">Staking Period</p>
              <p className="text-sm font-medium">{formatUtcRange(pool.startAt, pool.endAt)}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">Listing Time</p>
              <p className="text-sm font-medium">
                {new Date(pool.startAt).toISOString().replace("T", " ").slice(0, 19)} UTC
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="border-b border-border">
        <div className="flex gap-6">
          {(
            [
              { id: "pools" as const, label: "Pools" },
              { id: "info" as const, label: "Project Info" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "border-b-2 pb-2 text-sm font-semibold transition-colors",
                tab === item.id
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "info" ? (
        <Card>
          <CardContent className="space-y-4 pt-6 text-sm leading-relaxed text-muted-foreground">
            <div className="whitespace-pre-wrap">{pool.detailInfo}</div>
            <div className="space-y-2 border-t border-border pt-4 text-xs">
              <p>
                <span className="font-medium text-foreground">Reward token:</span> {pool.rewardTokenSymbol}
              </p>
              <p>
                <span className="font-medium text-foreground">Participants:</span> {pool.participantCount}
              </p>
              <p>
                <span className="font-medium text-foreground">Your reward:</span> proportional to your stake
                vs total pool stake.
              </p>
              <p>
                <span className="font-medium text-foreground">Claim earnings:</span> rewards are sent to your{" "}
                <Link href="/dashboard" className="text-primary hover:underline">
                  My Purse
                </Link>{" "}
                after admin distribution.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pool.stakeAssets.map((asset) => {
            const key = assetKey(asset);
            const isSelected = selectedAssetKey === key;
            const assetStake = myStakes.find(
              (s) =>
                s.assetSymbol === asset.assetSymbol &&
                (s.assetAddress ?? null) === (asset.assetAddress ?? null)
            );

            return (
              <Card
                key={key}
                className={cn("transition-colors", isSelected && "border-primary/50")}
              >
                <CardContent className="pt-6">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 text-left"
                    onClick={() => {
                      setSelectedAssetKey(isSelected ? null : key);
                      setAmount("");
                      setActionError(null);
                      setActionMessage(null);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <ProjectAvatar title={asset.assetSymbol} />
                      <div>
                        <p className="font-semibold">{asset.assetSymbol} Pool</p>
                        <p className="text-sm text-muted-foreground">
                          Stake {asset.assetSymbol} to earn {pool.rewardTokenSymbol}
                        </p>
                      </div>
                    </div>
                    <ChevronRight
                      className={cn(
                        "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                        isSelected && "rotate-90"
                      )}
                    />
                  </button>

                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Prize Pool ({pool.rewardTokenSymbol})</p>
                      <p className="font-medium">{formatLaunchpoolPrize(pool)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Staked</p>
                      <p className="font-medium">
                        {formatTokenWei(pool.totalStakedAmount)} (all assets)
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Participants</p>
                      <p className="font-medium">{pool.participantCount}</p>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="mt-4 space-y-3 rounded-lg border border-border bg-muted/20 p-4">
                      {!canParticipate ? (
                        <Button type="button" onClick={() => setSignInOpen(true)}>
                          Sign in to stake
                        </Button>
                      ) : !canStake ? (
                        <p className="text-sm text-muted-foreground">This launchpool is not open for staking.</p>
                      ) : (
                        <>
                          {(minLabel || maxLabel) && (
                            <p className="text-xs text-muted-foreground">
                              {minLabel && `Min: ${minLabel} ${asset.assetSymbol}`}
                              {minLabel && maxLabel && " · "}
                              {maxLabel && `Max: ${maxLabel} ${asset.assetSymbol}`}
                            </p>
                          )}
                          {assetStake && BigInt(assetStake.amount) > 0n && (
                            <p className="text-sm">
                              Your stake: {formatTokenWei(assetStake.amount)} {asset.assetSymbol}
                            </p>
                          )}
                          <div className="space-y-2">
                            <Label htmlFor={`stake-${key}`}>Amount ({asset.assetSymbol})</Label>
                            <Input
                              id={`stake-${key}`}
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                              placeholder="0.0"
                              disabled={actionLoading}
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              disabled={actionLoading || !amount}
                              onClick={() => void stake()}
                            >
                              {actionLoading ? "Processing…" : "Stake"}
                            </Button>
                            {assetStake && BigInt(assetStake.amount) > 0n && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={actionLoading}
                                onClick={() => void unstake()}
                              >
                                Unstake {formatTokenWei(assetStake.amount)} {asset.assetSymbol}
                              </Button>
                            )}
                          </div>
                        </>
                      )}
                      {actionError && <p className="text-sm text-red-600">{actionError}</p>}
                      {actionMessage && <p className="text-sm text-emerald-600">{actionMessage}</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <SignInModal open={signInOpen} onOpenChange={setSignInOpen} />
    </div>
  );
}
