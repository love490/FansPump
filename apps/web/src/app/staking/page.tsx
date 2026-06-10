"use client";

import { useEffect, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { parseEther, formatEther } from "viem";
import { STAKING_TIER_LABELS, STAKING_TIERS, type SupportedLpPool } from "@iopn/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Layers } from "lucide-react";
import { shortenAddress } from "@/lib/utils";

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

export default function StakingPage() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [positions, setPositions] = useState<StakingPosition[]>([]);
  const [walletTier, setWalletTier] = useState<string | null>(null);
  const [config, setConfig] = useState<StakingConfig | null>(null);
  const [assetType, setAssetType] = useState<"OPN" | "LP_TOKEN">("OPN");
  const [asset, setAsset] = useState("OPN");
  const [poolAddress, setPoolAddress] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

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

  async function stake() {
    if (!address || !amount) return;
    setLoading(true);
    try {
      const wei = parseEther(amount).toString();
      const auth = await signAction(`Stake ${assetType} ${asset}`);
      const res = await fetch("/api/staking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          assetType,
          asset: assetType === "OPN" ? "OPN" : asset,
          amount: wei,
          poolAddress: poolAddress || undefined,
          tokenAddress: tokenAddress || undefined,
          ...auth,
        }),
      });
      if (!res.ok) throw new Error("Stake failed");
      setAmount("");
      setPoolAddress("");
      setTokenAddress("");
      load();
    } finally {
      setLoading(false);
    }
  }

  async function unstake(positionId: string) {
    if (!address) return;
    const auth = await signAction(`Unstake ${positionId}`);
    await fetch("/api/staking", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet: address, positionId, ...auth }),
    });
    load();
  }

  const opnEnabled = config?.opnStakingEnabled !== false;
  const lpEnabled = config?.lpStakingEnabled !== false;

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
            <CardDescription>OPN staking or LP positions (OPN/USDT, OPN/USDC, OPN/Token)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Staking type</Label>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={assetType}
                onChange={(e) => {
                  const t = e.target.value as "OPN" | "LP_TOKEN";
                  setAssetType(t);
                  setAsset(t === "OPN" ? "OPN" : "");
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
              <>
                <div>
                  <Label>LP token address</Label>
                  <Input
                    value={asset}
                    onChange={(e) => setAsset(e.target.value)}
                    placeholder="0x… (pair LP token)"
                  />
                </div>
                <div>
                  <Label>Pool address (optional)</Label>
                  <Input
                    value={poolAddress}
                    onChange={(e) => setPoolAddress(e.target.value)}
                    placeholder="0x…"
                  />
                </div>
                <div>
                  <Label>Project token address (optional)</Label>
                  <Input
                    value={tokenAddress}
                    onChange={(e) => setTokenAddress(e.target.value)}
                    placeholder="0x…"
                  />
                </div>
                {config?.supportedLpPools?.length ? (
                  <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                    Supported LP pools:{" "}
                    {config.supportedLpPools.map((p) => p.label).join(", ")}
                  </div>
                ) : null}
              </>
            )}
            <div>
              <Label>Amount {assetType === "OPN" ? "(OPN)" : "(LP tokens)"}</Label>
              <Input
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
              />
            </div>
            <Button onClick={stake} disabled={loading || !amount}>
              {loading ? "Recording…" : "Record stake"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your positions</CardTitle>
        </CardHeader>
        <CardContent>
          {!isConnected ? (
            <p className="text-sm text-muted-foreground">Connect wallet to view positions.</p>
          ) : positions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active stake positions.</p>
          ) : (
            <div className="space-y-3">
              {positions.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {p.stakingType === "OPN" ? "OPN" : `LP ${shortenAddress(p.asset)}`}
                    </p>
                    <p className="text-muted-foreground">
                      {formatEther(BigInt(p.amount))} · {new Date(p.stakedAt).toLocaleDateString()}
                      {p.tier && ` · ${p.tier}`}
                      {p.poolAddress && ` · Pool ${shortenAddress(p.poolAddress)}`}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => unstake(p.id)}>
                    Unstake
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
