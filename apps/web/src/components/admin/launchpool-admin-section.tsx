"use client";

import { useCallback, useEffect, useState } from "react";
import { parseEther } from "viem";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { adminFetch } from "@/lib/admin-session";
import { formatAdminApiError } from "@/lib/admin/api-error";
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
  minStakeAmount: "",
  maxStakeAmount: "",
  startAt: "",
  endAt: "",
  durationLabel: "",
  stakeAssetsText: "OPN,USDT,USDC",
};

export function LaunchpoolAdminSection() {
  const [pools, setPools] = useState<SerializedLaunchpool[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingProjectInfo, setEditingProjectInfo] = useState<Record<string, string>>({});
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

  const rewardAmountValid =
    form.totalRewardAmount.trim() === "" || /^\d+$/.test(form.totalRewardAmount.trim());
  const minStakeValid =
    form.minStakeAmount.trim() === "" || /^\d+(\.\d+)?$/.test(form.minStakeAmount.trim());
  const maxStakeValid =
    form.maxStakeAmount.trim() === "" || /^\d+(\.\d+)?$/.test(form.maxStakeAmount.trim());

  const canCreate =
    form.title.trim().length >= 3 &&
    form.description.trim().length >= 10 &&
    form.detailInfo.trim().length >= 10 &&
    form.rewardTokenSymbol.trim().length > 0 &&
    rewardAmountValid &&
    minStakeValid &&
    maxStakeValid &&
    form.startAt &&
    form.endAt &&
    parseStakeAssets(form.stakeAssetsText).length > 0;

  async function createPool() {
    setLoading(true);
    setMessage(null);
    setError(null);

    if (form.title.trim().length < 3) {
      setError("Title must be at least 3 characters");
      setLoading(false);
      return;
    }
    if (form.description.trim().length < 10) {
      setError("Short description must be at least 10 characters");
      setLoading(false);
      return;
    }
    if (form.detailInfo.trim().length < 10) {
      setError("Project Info must be at least 10 characters");
      setLoading(false);
      return;
    }
    if (!form.rewardTokenSymbol.trim()) {
      setError("Reward token symbol is required");
      setLoading(false);
      return;
    }
    if (form.totalRewardUsd.trim() && (Number.isNaN(Number(form.totalRewardUsd)) || Number(form.totalRewardUsd) < 0)) {
      setError("Total reward USD must be a valid number");
      setLoading(false);
      return;
    }
    if (form.totalRewardAmount.trim() && !/^\d+$/.test(form.totalRewardAmount.trim())) {
      setError("Total reward amount must be digits only (wei, no decimals)");
      setLoading(false);
      return;
    }
    if (form.minStakeAmount.trim() && !/^\d+(\.\d+)?$/.test(form.minStakeAmount.trim())) {
      setError("Minimum stake must be a valid number");
      setLoading(false);
      return;
    }
    if (form.maxStakeAmount.trim() && !/^\d+(\.\d+)?$/.test(form.maxStakeAmount.trim())) {
      setError("Maximum stake must be a valid number");
      setLoading(false);
      return;
    }
    if (!form.startAt || !form.endAt) {
      setError("Start and end dates are required");
      setLoading(false);
      return;
    }
    const startDate = new Date(form.startAt);
    const endDate = new Date(form.endAt);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      setError("Invalid start or end date");
      setLoading(false);
      return;
    }
    if (endDate <= startDate) {
      setError("End date must be after start date");
      setLoading(false);
      return;
    }
    const stakeAssets = parseStakeAssets(form.stakeAssetsText);
    if (stakeAssets.length === 0) {
      setError("At least one stake asset is required");
      setLoading(false);
      return;
    }
    const rewardTokenAddress = form.rewardTokenAddress.trim();
    if (rewardTokenAddress && !/^0x[a-fA-F0-9]{40}$/.test(rewardTokenAddress)) {
      setError("Reward token address must be a valid 0x address or left empty");
      setLoading(false);
      return;
    }

    try {
      const minWei = form.minStakeAmount.trim()
        ? parseEther(form.minStakeAmount.trim()).toString()
        : "0";
      const maxWei = form.maxStakeAmount.trim()
        ? parseEther(form.maxStakeAmount.trim()).toString()
        : null;

      const res = await adminFetch("/api/admin/launchpool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          detailInfo: form.detailInfo.trim(),
          status: form.status,
          rewardTokenSymbol: form.rewardTokenSymbol.trim(),
          rewardTokenAddress: rewardTokenAddress || null,
          totalRewardUsd: form.totalRewardUsd.trim() ? Number(form.totalRewardUsd) : 0,
          totalRewardAmount: form.totalRewardAmount.trim() || "0",
          minStakeAmount: minWei,
          maxStakeAmount: maxWei,
          startAt: startDate.toISOString(),
          endAt: endDate.toISOString(),
          durationLabel: form.durationLabel.trim() || null,
          stakeAssets,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(formatAdminApiError(data, "Create failed"));
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

  async function updateProjectInfo(poolId: string) {
    const detailInfo = (editingProjectInfo[poolId] ?? "").trim();
    if (detailInfo.length < 10) {
      setError("Project Info must be at least 10 characters");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await adminFetch(`/api/admin/launchpool/${poolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ detailInfo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(formatAdminApiError(data, "Update failed"));
      setMessage("Project Info updated.");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
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
                placeholder="One-line summary shown on the launchpool card"
              />
            </div>
            <div className="space-y-2 sm:col-span-2 rounded-lg border border-border bg-muted/20 p-4">
              <Label htmlFor="launchpool-project-info">Project Info</Label>
              <p className="text-xs text-muted-foreground">
                Long-form project details shown on the <strong>Project Info</strong> tab when users open
                this launchpool.
              </p>
              <textarea
                id="launchpool-project-info"
                value={form.detailInfo}
                onChange={(e) => setForm({ ...form, detailInfo: e.target.value })}
                rows={6}
                placeholder="About the project, tokenomics, roadmap, links, and anything participants should know…"
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
              <Label htmlFor="launchpool-reward-usd">Total reward USD (display, optional)</Label>
              <Input
                id="launchpool-reward-usd"
                type="number"
                min={0}
                step="any"
                placeholder="e.g. 50000"
                value={form.totalRewardUsd}
                onChange={(e) => setForm({ ...form, totalRewardUsd: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Optional. Shown on the launchpool card when set.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="launchpool-reward-wei">Total reward amount (wei, optional)</Label>
              <Input
                id="launchpool-reward-wei"
                inputMode="numeric"
                pattern="\d+"
                placeholder="e.g. 1000000000000000000000"
                value={form.totalRewardAmount}
                onChange={(e) =>
                  setForm({ ...form, totalRewardAmount: e.target.value.replace(/\D/g, "") })
                }
              />
              <p className="text-xs text-muted-foreground">
                Optional. Digits only — whole wei amount used for reward distribution.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="launchpool-min-stake">Minimum stake (optional)</Label>
              <Input
                id="launchpool-min-stake"
                placeholder="e.g. 1"
                value={form.minStakeAmount}
                onChange={(e) => setForm({ ...form, minStakeAmount: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Token amount per stake (converted to wei).</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="launchpool-max-stake">Maximum stake (optional)</Label>
              <Input
                id="launchpool-max-stake"
                placeholder="e.g. 10000"
                value={form.maxStakeAmount}
                onChange={(e) => setForm({ ...form, maxStakeAmount: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Max total stake per wallet per asset.</p>
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
          <Button type="button" disabled={loading || !canCreate} onClick={() => void createPool()}>
            Create launchpool
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {pools.map((pool) => (
          <Card key={pool.id}>
            <CardContent className="space-y-4 pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{pool.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {pool.totalRewardUsd > 0
                      ? `$${pool.totalRewardUsd.toLocaleString()} · `
                      : ""}
                    {pool.participantCount} participants
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
              </div>
              <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-4">
                <Label htmlFor={`project-info-${pool.id}`}>Project Info</Label>
                <p className="text-xs text-muted-foreground">
                  Shown on the Project Info tab for this launchpool.
                </p>
                <textarea
                  id={`project-info-${pool.id}`}
                  rows={5}
                  value={editingProjectInfo[pool.id] ?? pool.detailInfo ?? ""}
                  onChange={(e) =>
                    setEditingProjectInfo((prev) => ({ ...prev, [pool.id]: e.target.value }))
                  }
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={loading}
                  onClick={() => void updateProjectInfo(pool.id)}
                >
                  Save Project Info
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
