"use client";

import { useEffect, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { parseEther, formatEther } from "viem";
import { STAKING_TIER_LABELS, STAKING_TIERS } from "@iopn/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Layers } from "lucide-react";

type StakingPosition = {
  id: string;
  assetType: "OPN" | "LP_TOKEN";
  asset: string;
  amount: string;
  tier: string | null;
  stakedAt: string;
};

export default function StakingPage() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [positions, setPositions] = useState<StakingPosition[]>([]);
  const [assetType, setAssetType] = useState<"OPN" | "LP_TOKEN">("OPN");
  const [asset, setAsset] = useState("OPN");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  function load() {
    if (!address) return;
    fetch(`/api/staking?wallet=${address}`)
      .then((r) => r.json())
      .then((d) => setPositions(d.positions ?? []));
  }

  useEffect(() => {
    load();
  }, [address]);

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
          ...auth,
        }),
      });
      if (!res.ok) throw new Error("Stake failed");
      setAmount("");
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Layers className="h-6 w-6" /> Staking
        </h1>
        <p className="mt-1 text-muted-foreground">
          Track OPN and LP token stakes. Reward distribution is not active yet — positions are recorded for future benefits.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {STAKING_TIERS.map((tier) => (
          <Badge key={tier} variant="outline">
            {STAKING_TIER_LABELS[tier]}
          </Badge>
        ))}
      </div>

      {isConnected && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Stake assets</CardTitle>
            <CardDescription>OPN or liquidity pool (LP) tokens</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Asset type</Label>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={assetType}
                onChange={(e) => {
                  const t = e.target.value as "OPN" | "LP_TOKEN";
                  setAssetType(t);
                  setAsset(t === "OPN" ? "OPN" : "");
                }}
              >
                <option value="OPN">OPN</option>
                <option value="LP_TOKEN">LP Token (OPN/USDT, OPN/USDC, OPN/ANY)</option>
              </select>
            </div>
            {assetType === "LP_TOKEN" && (
              <div>
                <Label>LP token address</Label>
                <Input
                  value={asset}
                  onChange={(e) => setAsset(e.target.value)}
                  placeholder="0x..."
                />
              </div>
            )}
            <div>
              <Label>Amount</Label>
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
              {loading ? "Recording..." : "Record stake"}
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
                      {p.assetType === "OPN" ? "OPN" : `LP ${p.asset.slice(0, 10)}…`}
                    </p>
                    <p className="text-muted-foreground">
                      {formatEther(BigInt(p.amount))} · {new Date(p.stakedAt).toLocaleDateString()}
                      {p.tier && ` · ${p.tier}`}
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
