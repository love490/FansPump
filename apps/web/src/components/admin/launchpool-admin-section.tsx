"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { adminFetch } from "@/lib/admin-session";
import type { SerializedLaunchpool } from "@/lib/launchpool/serialize";

const emptyForm = {
  title: "",
  description: "",
  detailInfo: "",
  status: "ACTIVE" as "ACTIVE" | "ONGOING" | "ENDED",
  rewardTokenSymbol: "",
  rewardTokenAddress: "",
  totalRewardUsd: "",
  totalRewardAmount: "",
  startAt: "",
  endAt: "",
  durationLabel: "",
  stakeAssetsText: "OPN,USDT,USDC",
};

export function LaunchpoolAdminSection() {
  const [pools, setPools] = useState<SerializedLaunchpool[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    adminFetch("/api/admin/launchpool")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { pools?: SerializedLaunchpool[] }) => setPools(data.pools ?? []))
      .catch(() => setPools([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function parseStakeAssets(text: string) {
    return text
      .split(",")
      .map((part) => part.trim().toUpperCase())
      .filter(Boolean)
      .map((symbol) => ({
        assetType: symbol,
        assetSymbol: symbol,
        assetAddress: null,
      }));
  }

  async function createPool() {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/launchpool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          detailInfo: form.detailInfo,
          status: form.status,
          rewardTokenSymbol: form.rewardTokenSymbol,
          rewardTokenAddress: form.rewardTokenAddress || null,
          totalRewardUsd: Number(form.totalRewardUsd),
          totalRewardAmount: form.totalRewardAmount,
          startAt: new Date(form.startAt).toISOString(),
          endAt: new Date(form.endAt).toISOString(),
          durationLabel: form.durationLabel || null,
          stakeAssets: parseStakeAssets(form.stakeAssetsText),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Create failed");
      setForm(emptyForm);
      setMessage("Launchpool created.");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setLoading(false);
    }
  }

  async function distribute(poolId: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/launchpool/${poolId}/distribute`, { method: "POST" });
      const data = (await res.json()) as { error?: string; distributed?: number };
      if (!res.ok) throw new Error(data.error ?? "Distribution failed");
      setMessage(`Rewards distributed to ${data.distributed ?? 0} wallets.`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Distribution failed");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(poolId: string, status: "ACTIVE" | "ONGOING" | "ENDED") {
    setLoading(true);
    try {
      const res = await adminFetch(`/api/admin/launchpool/${poolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Update failed");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Launchpool campaigns</CardTitle>
          <CardDescription>
            Admin-only. Create launchpools for users to stake OPN, stablecoins, or project tokens and
            earn reward tokens. Distribute rewards to My Purse when a pool ends.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Short description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Full explanation (shown on ✓ info tick)</Label>
              <textarea
                value={form.detailInfo}
                onChange={(e) => setForm({ ...form, detailInfo: e.target.value })}
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as "ACTIVE" | "ONGOING" | "ENDED" })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="ACTIVE">Active</option>
                <option value="ONGOING">Ongoing</option>
                <option value="ENDED">Ended</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Duration label</Label>
              <Input
                placeholder="e.g. 30 days"
                value={form.durationLabel}
                onChange={(e) => setForm({ ...form, durationLabel: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Reward token symbol</Label>
              <Input
                value={form.rewardTokenSymbol}
                onChange={(e) => setForm({ ...form, rewardTokenSymbol: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Reward token address (optional)</Label>
              <Input
                value={form.rewardTokenAddress}
                onChange={(e) => setForm({ ...form, rewardTokenAddress: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Total reward USD (display)</Label>
              <Input
                value={form.totalRewardUsd}
                onChange={(e) => setForm({ ...form, totalRewardUsd: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Total reward amount (wei)</Label>
              <Input
                value={form.totalRewardAmount}
                onChange={(e) => setForm({ ...form, totalRewardAmount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Start</Label>
              <Input
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => setForm({ ...form, startAt: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>End</Label>
              <Input
                type="datetime-local"
                value={form.endAt}
                onChange={(e) => setForm({ ...form, endAt: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Stake assets (comma-separated symbols)</Label>
              <Input
                value={form.stakeAssetsText}
                onChange={(e) => setForm({ ...form, stakeAssetsText: e.target.value })}
                placeholder="OPN,USDT,USDC,MYTOKEN"
              />
            </div>
          </div>
          {message && <p className="text-sm text-emerald-600">{message}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="button" disabled={loading} onClick={() => void createPool()}>
            Create launchpool
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {pools.map((pool) => (
          <Card key={pool.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
              <div>
                <p className="font-semibold">{pool.title}</p>
                <p className="text-sm text-muted-foreground">
                  ${pool.totalRewardUsd.toLocaleString()} · {pool.participantCount} participants
                </p>
                <Badge className="mt-2" variant="secondary">
                  {pool.status}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={loading || pool.rewardsDistributed}
                  onClick={() => void distribute(pool.id)}
                >
                  Distribute rewards
                </Button>
                {(["ACTIVE", "ONGOING", "ENDED"] as const).map((status) => (
                  <Button
                    key={status}
                    type="button"
                    size="sm"
                    variant={pool.status === status ? "default" : "outline"}
                    disabled={loading}
                    onClick={() => void updateStatus(pool.id, status)}
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
