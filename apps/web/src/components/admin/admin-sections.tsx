"use client";

import { apiUrl } from "@/lib/api";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-session";
import { useAdmin } from "@/components/admin/admin-context";
import { FactoryControls } from "@/components/admin/factory-controls";
import { AdminAccountSection } from "@/components/admin/admin-account-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Download, AlertTriangle } from "lucide-react";
import { useAccount } from "wagmi";
import { LaunchpoolAdminSection } from "@/components/admin/launchpool-admin-section";

function SaveButton({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return (
    <Button onClick={onClick} disabled={saving} size="sm">
      {saving ? "Saving..." : "Save changes"}
    </Button>
  );
}

function FeeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type="number"
        step="0.1"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1"
      />
    </div>
  );
}

export function OverviewSection() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    adminFetch("/api/admin/overview").then((r) => r.json()).then((d) => setData(d.overview));
  }, []);

  if (!data) return <p className="text-muted-foreground">Loading overview...</p>;

  const stats: [string, unknown][] = [
    ["Total Tokens", data.totalTokensCreated],
    ["Verified Tokens", data.totalVerifiedTokens],
    ["Platform Revenue (OPN)", data.totalPlatformRevenue],
    ["Trading Volume", data.totalTradingVolume],
    ["Active Users (24h)", data.totalActiveUsers],
    ["Creator Earnings (OPN)", data.totalCreatorEarnings],
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard Overview</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(([label, value]) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold">{String(value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Latest Token Creations</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(data.latestTokenCreations as { name: string; symbol: string; contractAddress: string }[])?.map((t) => (
              <div key={t.contractAddress} className="flex justify-between border-b py-2">
                <Link href={`/token/${t.contractAddress}`} className="font-medium hover:text-primary">
                  {t.name} ({t.symbol})
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Latest Transactions</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(data.latestTransactions as { txHash: string; volumeOpn: number; tokenAddress: string }[])?.map((t) => (
              <div key={t.txHash} className="border-b py-2 font-mono text-xs">
                {t.tokenAddress.slice(0, 10)}… · {t.volumeOpn.toFixed(4)} OPN
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function CreationFeesSection() {
  const [fees, setFees] = useState<Record<string, number> | null>(null);
  const [saving, setSaving] = useState(false);
  const load = useCallback(() => {
    adminFetch("/api/admin/settings/creation-fees").then((r) => r.json()).then((d) => setFees(d.fees));
  }, []);
  useEffect(() => { load(); }, [load]);
  if (!fees) return null;
  const save = async () => {
    setSaving(true);
    await adminFetch("/api/admin/settings/creation-fees", { method: "PATCH", body: JSON.stringify({ fees }) });
    setSaving(false);
  };
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Creation Fees</h2>
      <p className="text-sm text-muted-foreground">Changes apply to future deployments only. Existing tokens unchanged.</p>
      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(fees).map(([key, val]) => (
            <FeeInput key={key} label={key.replace(/([A-Z])/g, " $1")} value={val} onChange={(v) => setFees({ ...fees, [key]: v })} />
          ))}
        </CardContent>
      </Card>
      <SaveButton saving={saving} onClick={save} />
    </div>
  );
}

export function TradingFeesSection() {
  const [fees, setFees] = useState<Record<string, number> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    adminFetch("/api/admin/settings/trading-fees").then((r) => r.json()).then((d) => setFees(d.fees));
  }, []);
  if (!fees) return null;
  const sum = (fees.creatorShareBps ?? 0) + (fees.treasuryShareBps ?? 0) + (fees.poolShareBps ?? 0);
  const save = async () => {
    if (sum !== 10000) { setError("Creator + Treasury + Pool must equal 100%"); return; }
    setSaving(true);
    const res = await adminFetch("/api/admin/settings/trading-fees", { method: "PATCH", body: JSON.stringify({ fees }) });
    if (!res.ok) setError("Save failed");
    else setError("");
    setSaving(false);
  };
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Trading Fees</h2>
      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
          <FeeInput label="Total Trading Fee (bps)" value={fees.totalTradingFeeBps} onChange={(v) => setFees({ ...fees, totalTradingFeeBps: v })} />
          <FeeInput label="Creator Share (bps)" value={fees.creatorShareBps} onChange={(v) => setFees({ ...fees, creatorShareBps: v })} />
          <FeeInput label="Treasury Share (bps)" value={fees.treasuryShareBps} onChange={(v) => setFees({ ...fees, treasuryShareBps: v })} />
          <FeeInput label="Pool Share (bps)" value={fees.poolShareBps} onChange={(v) => setFees({ ...fees, poolShareBps: v })} />
        </CardContent>
      </Card>
      <p className="text-sm">Split total: {(sum / 100).toFixed(2)}% {sum !== 10000 && <span className="text-destructive">(must be 100%)</span>}</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <SaveButton saving={saving} onClick={save} />
    </div>
  );
}

export function TreasurySection() {
  const [treasury, setTreasury] = useState<Record<string, string> | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    adminFetch("/api/admin/settings/treasury").then((r) => r.json()).then((d) => setTreasury(d.treasury));
  }, []);
  if (!treasury) return null;
  const save = async () => {
    if (!confirm) { setConfirm(true); return; }
    setSaving(true);
    await adminFetch("/api/admin/settings/treasury", { method: "PATCH", body: JSON.stringify({ treasury }) });
    setSaving(false);
    setConfirm(false);
  };
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Treasury Settings</h2>
      <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Wallet changes affect future revenue routing. EOA supported now; Safe Multisig ready for future migration.</span>
      </div>
      <Card>
        <CardContent className="space-y-4 pt-6">
          {["treasuryWallet", "revenueWallet", "emergencyWallet"].map((key) => (
            <div key={key}>
              <Label>{key.replace(/([A-Z])/g, " $1")}</Label>
              <Input className="mt-1 font-mono" value={treasury[key] ?? ""} onChange={(e) => setTreasury({ ...treasury, [key]: e.target.value })} placeholder="0x..." />
            </div>
          ))}
          <div>
            <Label>Wallet Type</Label>
            <select
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={treasury.walletType ?? "EOA"}
              onChange={(e) => setTreasury({ ...treasury, walletType: e.target.value })}
            >
              <option value="EOA">EOA</option>
              <option value="SAFE_MULTISIG">Safe Multisig (future)</option>
            </select>
          </div>
        </CardContent>
      </Card>
      <Button variant={confirm ? "destructive" : "default"} onClick={save} disabled={saving}>
        {confirm ? "Confirm wallet change" : saving ? "Saving..." : "Save treasury settings"}
      </Button>
    </div>
  );
}

export function VerificationSection() {
  const [rows, setRows] = useState<{ tokenId: string; token: string; wallet: string; status: string; submittedAt: string }[]>([]);
  const [creators, setCreators] = useState<{ walletAddress: string; verifiedAt: string }[]>([]);
  const load = useCallback(() => {
    adminFetch("/api/admin/verification").then((r) => r.json()).then((d) => setRows(d.submissions ?? []));
    adminFetch("/api/admin/creator-verifications").then((r) => r.json()).then((d) => setCreators(d.creators ?? []));
  }, []);
  useEffect(() => { load(); }, [load]);
  const act = async (tokenId: string, action: string) => {
    await adminFetch("/api/admin/verification", { method: "PATCH", body: JSON.stringify({ tokenId, action }) });
    load();
  };
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Verification Center</h2>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="p-3 text-left">Token</th>
              <th className="p-3 text-left">Wallet</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Submitted</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No verification submissions</td></tr>
            ) : rows.map((r) => (
              <tr key={r.tokenId} className="border-b">
                <td className="p-3">{r.token}</td>
                <td className="p-3 font-mono text-xs">{r.wallet}</td>
                <td className="p-3"><Badge>{r.status}</Badge></td>
                <td className="p-3 text-xs">{new Date(r.submittedAt).toLocaleDateString()}</td>
                <td className="p-3 space-x-1">
                  <Button size="sm" variant="outline" onClick={() => act(r.tokenId, "approve")}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => act(r.tokenId, "reject")}>Reject</Button>
                  <Button size="sm" variant="outline" onClick={() => act(r.tokenId, "revoke")}>Revoke</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Verified Creators (view only)</CardTitle>
          <CardDescription>Wallet signature verifications — cannot be bypassed from admin</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr><th className="p-3 text-left">Wallet</th><th className="p-3 text-left">Verified</th></tr>
            </thead>
            <tbody>
              {creators.length === 0 ? (
                <tr><td colSpan={2} className="p-4 text-center text-muted-foreground">No verified creators yet</td></tr>
              ) : creators.map((c) => (
                <tr key={c.walletAddress} className="border-b">
                  <td className="p-3 font-mono text-xs">{c.walletAddress}</td>
                  <td className="p-3 text-xs">{new Date(c.verifiedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

export function DiscoverySection() {
  const [discovery, setDiscovery] = useState<Record<string, number> | null>(null);
  const [tokens, setTokens] = useState<{ id: string; name: string; symbol: string; contractAddress: string; isFeatured: boolean; isHidden?: boolean; isScam?: boolean }[]>([]);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const loadTokens = useCallback(() => {
    adminFetch(`/api/admin/tokens${query ? `?q=${encodeURIComponent(query)}` : ""}`).then((r) => r.json()).then((d) => setTokens(d.tokens ?? []));
  }, [query]);
  useEffect(() => {
    adminFetch("/api/admin/settings/discovery").then((r) => r.json()).then((d) => setDiscovery(d.discovery));
    loadTokens();
  }, [loadTokens]);
  const patchToken = async (id: string, data: Record<string, boolean>) => {
    await adminFetch(`/api/admin/tokens/${id}`, { method: "PATCH", body: JSON.stringify(data) });
    loadTokens();
  };
  if (!discovery) return null;
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Discovery Management</h2>
      <Card>
        <CardHeader><CardTitle>Algorithm Weights</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {Object.entries(discovery).map(([key, val]) => (
            <FeeInput key={key} label={key} value={val} onChange={(v) => setDiscovery({ ...discovery, [key]: v })} />
          ))}
        </CardContent>
      </Card>
      <SaveButton saving={saving} onClick={async () => {
        setSaving(true);
        await adminFetch("/api/admin/settings/discovery", { method: "PATCH", body: JSON.stringify({ discovery }) });
        setSaving(false);
      }} />
      <Card>
        <CardHeader><CardTitle>Token Curation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Search tokens..." value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadTokens()} />
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50"><tr>
                <th className="p-3 text-left">Token</th><th className="p-3 text-left">Featured</th><th className="p-3 text-left">Actions</th>
              </tr></thead>
              <tbody>
                {tokens.map((t) => (
                  <tr key={t.id} className="border-b">
                    <td className="p-3">{t.name} ({t.symbol})</td>
                    <td className="p-3">{t.isFeatured ? <Badge>Featured</Badge> : "—"}</td>
                    <td className="p-3 flex flex-wrap gap-1">
                      <Button size="sm" variant="outline" onClick={() => patchToken(t.id, { isFeatured: !t.isFeatured })}><Star className="h-3 w-3" />{t.isFeatured ? "Unfeature" : "Feature"}</Button>
                      <Button size="sm" variant="outline" onClick={() => patchToken(t.id, { isHidden: !t.isHidden })}>{t.isHidden ? "Unhide" : "Hide Spam"}</Button>
                      <Button size="sm" variant="destructive" onClick={() => patchToken(t.id, { isScam: !t.isScam })}>{t.isScam ? "Restore" : "Remove Scam"}</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function AnalyticsSection() {
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    adminFetch("/api/admin/analytics").then((r) => r.json()).then((d) => setAnalytics(d.analytics));
  }, []);
  const exportCsv = async () => {
    const u = new URL(apiUrl("/api/admin/analytics"));
    u.searchParams.set("format", "csv");
    window.open(u.toString(), "_blank");
  };
  if (!analytics) return null;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Analytics</h2>
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["Total Volume", analytics.totalVolume],
            ["24h Volume", analytics.volume24h],
            ["7d Volume", analytics.volume7d],
            ["24h Trades", analytics.trades24h],
          ] as [string, unknown][]
        ).map(([l, v]) => (
          <Card key={l}>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">{l}</p>
              <p className="text-xl font-bold">{String(v)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Revenue Breakdown</CardTitle></CardHeader>
        <CardContent className="text-sm">
          <p>Platform Treasury: {(analytics.revenueBreakdown as { platformTreasuryOpn: number })?.platformTreasuryOpn} OPN</p>
          <p>Creator Earnings: {(analytics.revenueBreakdown as { creatorEarningsOpn: number })?.creatorEarningsOpn} OPN</p>
        </CardContent>
      </Card>
    </div>
  );
}

export function CreatorEarningsSection() {
  const [rows, setRows] = useState<{ creator: string; token: string; accumulatedEarnings: number; pendingEarnings: number }[]>([]);
  useEffect(() => {
    adminFetch("/api/admin/creator-earnings").then((r) => r.json()).then((d) => setRows(d.earnings ?? []));
  }, []);
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Creator Earnings</h2>
      <p className="text-sm text-muted-foreground">Read-only monitoring. Admins cannot withdraw or edit creator balances.</p>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50"><tr>
            <th className="p-3 text-left">Creator</th><th className="p-3 text-left">Token</th>
            <th className="p-3 text-left">Accumulated</th><th className="p-3 text-left">Pending</th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b">
                <td className="p-3 font-mono text-xs">{r.creator}</td>
                <td className="p-3">{r.token}</td>
                <td className="p-3">{r.accumulatedEarnings.toFixed(4)} OPN</td>
                <td className="p-3">{r.pendingEarnings.toFixed(4)} OPN</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PoolShareSection() {
  const [poolShare, setPoolShare] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    adminFetch("/api/admin/settings/pool-share").then((r) => r.json()).then((d) => setPoolShare(d.poolShare));
  }, []);
  if (!poolShare) return null;
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Pool Share</h2>
      <p className="text-sm text-muted-foreground">Tracking only — no automatic liquidity injection yet.</p>
      <Card><CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
        <FeeInput label="Pool Share %" value={Number(poolShare.poolSharePercentage)} onChange={(v) => setPoolShare({ ...poolShare, poolSharePercentage: v })} />
        <div><Label>Pool Reserve Target</Label><Input className="mt-1" value={String(poolShare.poolReserveTarget ?? "")} onChange={(e) => setPoolShare({ ...poolShare, poolReserveTarget: e.target.value })} /></div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={Boolean(poolShare.trackingOnly ?? true)}
            onChange={(e) => setPoolShare({ ...poolShare, trackingOnly: e.target.checked })}
          />
          Tracking only (no on-chain pool injection)
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={Boolean(poolShare.liquidityIncentiveEnabled)}
            onChange={(e) => setPoolShare({ ...poolShare, liquidityIncentiveEnabled: e.target.checked })}
          />
          Liquidity incentives enabled (future — not active)
        </label>
      </CardContent></Card>
      <SaveButton saving={saving} onClick={async () => {
        setSaving(true);
        await adminFetch("/api/admin/settings/pool-share", { method: "PATCH", body: JSON.stringify({ poolShare }) });
        setSaving(false);
      }} />
    </div>
  );
}

export function BridgeSection() {
  const [bridge, setBridge] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    adminFetch("/api/admin/settings/bridge").then((r) => r.json()).then((d) => setBridge(d.bridge));
  }, []);
  if (!bridge) return null;
  return (
    <div className="space-y-4 opacity-60">
      <h2 className="text-2xl font-bold">Bridge Settings (Future)</h2>
      <Card>
        <CardHeader><CardDescription>Configuration only — execution disabled until bridge is implemented.</CardDescription></CardHeader>
        <CardContent className="space-y-4 pt-0">
          <FeeInput label="Bridge Fee (bps)" value={Number(bridge.bridgeFeeBps)} onChange={(v) => setBridge({ ...bridge, bridgeFeeBps: v })} />
          <div><Label>Bridge Treasury Wallet</Label><Input className="mt-1 font-mono" value={String(bridge.bridgeTreasuryWallet ?? "")} disabled /></div>
        </CardContent>
      </Card>
    </div>
  );
}

export function SecuritySection() {
  const [security, setSecurity] = useState<Record<string, boolean> | null>(null);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    adminFetch("/api/admin/settings/security").then((r) => r.json()).then((d) => setSecurity(d.security));
  }, []);
  if (!security) return null;
  const toggle = (key: string) => {
    if (confirmAction !== key) { setConfirmAction(key); return; }
    setSecurity({ ...security, [key]: !security[key] });
    setConfirmAction(null);
  };
  const save = async () => {
    setSaving(true);
    await adminFetch("/api/admin/settings/security", { method: "PATCH", body: JSON.stringify({ security }) });
    setSaving(false);
  };
  const items = [
    { key: "tokenCreationPaused", label: "Pause Token Creation", resume: "Resume Token Creation" },
    { key: "tradingPaused", label: "Pause Trading", resume: "Resume Trading" },
    { key: "claimsPaused", label: "Pause Claims", resume: "Resume Claims" },
  ];
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Protocol Security</h2>
      <Card><CardContent className="space-y-3 pt-6">
        {items.map(({ key, label, resume }) => (
          <div key={key} className="flex items-center justify-between rounded-lg border p-3">
            <span className="text-sm font-medium">{security[key] ? resume : label}</span>
            <Button size="sm" variant={security[key] ? "default" : "destructive"} onClick={() => toggle(key)}>
              {confirmAction === key ? "Confirm?" : security[key] ? "Resume" : "Pause"}
            </Button>
          </div>
        ))}
      </CardContent></Card>
      <SaveButton saving={saving} onClick={save} />
    </div>
  );
}

export function SystemSection() {
  const [system, setSystem] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    adminFetch("/api/admin/settings/system").then((r) => r.json()).then((d) => setSystem(d.system));
  }, []);
  if (!system) return null;
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">System Settings</h2>
      <Card><CardContent className="space-y-4 pt-6">
        {["platformName", "platformDescription", "announcementBanner", "supportEmail", "supportUrl"].map((key) => (
          <div key={key}><Label>{key}</Label><Input className="mt-1" value={String(system[key] ?? "")} onChange={(e) => setSystem({ ...system, [key]: e.target.value })} /></div>
        ))}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!system.maintenanceMode} onChange={(e) => setSystem({ ...system, maintenanceMode: e.target.checked })} /> Maintenance Mode</label>
      </CardContent></Card>
      <SaveButton saving={saving} onClick={async () => {
        setSaving(true);
        await adminFetch("/api/admin/settings/system", { method: "PATCH", body: JSON.stringify({ system }) });
        setSaving(false);
      }} />
    </div>
  );
}

export function FactorySection() {
  const { address } = useAccount();
  const [isFactoryAdmin, setIsFactoryAdmin] = useState(false);
  useEffect(() => {
    if (!address) return;
    fetch(apiUrl(`/api/admin/factory-admin?wallet=${address}`)).then((r) => r.json()).then((d) => setIsFactoryAdmin(d.isFactoryAdmin));
  }, [address]);
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">On-chain Factory Controls</h2>
      <p className="text-sm text-muted-foreground">Existing factory admin controls — pause factory, update on-chain creation fee and recipient.</p>
      <FactoryControls isFactoryAdmin={isFactoryAdmin} />
    </div>
  );
}

export function ActivityLogsSection() {
  const [logs, setLogs] = useState<{ admin: string; action: string; timestamp: string; ipAddress: string | null }[]>([]);
  useEffect(() => {
    adminFetch("/api/admin/activity-logs").then((r) => r.json()).then((d) => setLogs(d.logs ?? []));
  }, []);
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Activity Logs</h2>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50"><tr>
            <th className="p-3 text-left">Admin</th><th className="p-3 text-left">Action</th>
            <th className="p-3 text-left">Time</th><th className="p-3 text-left">IP</th>
          </tr></thead>
          <tbody>
            {logs.map((l, i) => (
              <tr key={i} className="border-b">
                <td className="p-3 font-mono text-xs">{l.admin}</td>
                <td className="p-3">{l.action}</td>
                <td className="p-3 text-xs">{new Date(l.timestamp).toLocaleString()}</td>
                <td className="p-3 text-xs">{l.ipAddress ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function RolesSection() {
  const { role } = useAdmin();
  const [admins, setAdmins] = useState<
    { id: string; email: string; role: string; twoFactorEnabled: boolean; lastLogin: string | null }[]
  >([]);
  useEffect(() => {
    if (role === "SUPER_ADMIN") {
      adminFetch("/api/admin/roles").then((r) => r.json()).then((d) => setAdmins(d.admins ?? []));
    }
  }, [role]);
  if (role !== "SUPER_ADMIN") return <p className="text-muted-foreground">Super admin access required.</p>;
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Platform Admins</h2>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-left">2FA</th>
              <th className="p-3 text-left">Last login</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id} className="border-b">
                <td className="p-3">{a.email}</td>
                <td className="p-3"><Badge>{a.role.replace("_", " ")}</Badge></td>
                <td className="p-3">{a.twoFactorEnabled ? "Enabled" : "Off"}</td>
                <td className="p-3 text-xs text-muted-foreground">
                  {a.lastLogin ? new Date(a.lastLogin).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Super admins can create additional admins via POST /api/admin/admins. Roles: Super Admin, Admin, Moderator.
      </p>
    </div>
  );
}

export function CategoriesSection() {
  const [stats, setStats] = useState<{ category: string; count: number }[]>([]);
  useEffect(() => {
    fetch(apiUrl("/api/analytics/extended"))
      .then((r) => r.json())
      .then((d) => setStats(d.analytics?.categoryStats ?? []));
  }, []);
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Token Categories</h2>
      <p className="text-sm text-muted-foreground">Category distribution across tokens. Categories are fixed enums; old tokens default to Other.</p>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr><th className="p-3 text-left">Category</th><th className="p-3 text-left">Tokens</th></tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.category} className="border-b">
                <td className="p-3">{s.category}</td>
                <td className="p-3 font-medium">{s.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AnnouncementsModerationSection() {
  const [rows, setRows] = useState<{ id: string; title: string; tokenSymbol: string; creatorWallet: string; isHidden: boolean; createdAt: string }[]>([]);
  const load = useCallback(() => {
    adminFetch("/api/admin/announcements").then((r) => r.json()).then((d) => setRows(d.announcements ?? []));
  }, []);
  useEffect(() => { load(); }, [load]);
  const toggle = async (id: string, isHidden: boolean) => {
    await adminFetch("/api/admin/announcements", { method: "PATCH", body: JSON.stringify({ id, isHidden }) });
    load();
  };
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Announcement Moderation</h2>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="p-3 text-left">Title</th>
              <th className="p-3 text-left">Token</th>
              <th className="p-3 text-left">Creator</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="p-3">{r.title}</td>
                <td className="p-3">{r.tokenSymbol}</td>
                <td className="p-3 font-mono text-xs">{r.creatorWallet.slice(0, 10)}…</td>
                <td className="p-3"><Badge variant={r.isHidden ? "secondary" : "default"}>{r.isHidden ? "Hidden" : "Visible"}</Badge></td>
                <td className="p-3">
                  <Button size="sm" variant="outline" onClick={() => toggle(r.id, !r.isHidden)}>
                    {r.isHidden ? "Restore" : "Hide"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StakingConfigSection() {
  const [config, setConfig] = useState<{
    tiers: { tier: string; minStakeOpn: string; creationFeeDiscountBps: number; visibilityBoost: number; rewardEligible: boolean }[];
    visibilityBoostEnabled?: boolean;
    discoveryRankingBoostEnabled?: boolean;
    opnStakingEnabled?: boolean;
    lpStakingEnabled?: boolean;
    supportedLpPools?: { id: string; label: string; token0: string; token1: string; poolAddress?: string; enabled: boolean }[];
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const load = useCallback(() => {
    adminFetch("/api/admin/settings/staking").then((r) => r.json()).then((d) => setConfig(d.config));
  }, []);
  useEffect(() => { load(); }, [load]);
  if (!config) return null;
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Staking Tier Configuration</h2>
      <p className="text-sm text-muted-foreground">Config only — reward distribution and APY are not active yet.</p>
      <Card>
        <CardContent className="grid gap-3 pt-6 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.visibilityBoostEnabled ?? true}
              onChange={(e) => setConfig({ ...config, visibilityBoostEnabled: e.target.checked })}
            />
            Visibility boosts (future)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.discoveryRankingBoostEnabled ?? true}
              onChange={(e) => setConfig({ ...config, discoveryRankingBoostEnabled: e.target.checked })}
            />
            Discovery ranking boosts (future)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.opnStakingEnabled ?? true}
              onChange={(e) => setConfig({ ...config, opnStakingEnabled: e.target.checked })}
            />
            OPN staking enabled
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.lpStakingEnabled ?? true}
              onChange={(e) => setConfig({ ...config, lpStakingEnabled: e.target.checked })}
            />
            LP staking enabled
          </label>
        </CardContent>
      </Card>
      {(config.supportedLpPools ?? []).map((pool, i) => (
        <Card key={pool.id}>
          <CardHeader><CardTitle className="text-base">{pool.label}</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={pool.enabled}
                onChange={(e) => {
                  const supportedLpPools = [...(config.supportedLpPools ?? [])];
                  supportedLpPools[i] = { ...pool, enabled: e.target.checked };
                  setConfig({ ...config, supportedLpPools });
                }}
              />
              Supported for LP staking
            </label>
            <div className="sm:col-span-2">
              <Label>Pool address (optional)</Label>
              <Input
                className="mt-1 font-mono text-xs"
                value={pool.poolAddress ?? ""}
                onChange={(e) => {
                  const supportedLpPools = [...(config.supportedLpPools ?? [])];
                  supportedLpPools[i] = { ...pool, poolAddress: e.target.value };
                  setConfig({ ...config, supportedLpPools });
                }}
              />
            </div>
          </CardContent>
        </Card>
      ))}
      {config.tiers.map((tier, i) => (
        <Card key={tier.tier}>
          <CardHeader><CardTitle>{tier.tier}</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Min stake OPN</Label>
              <Input value={tier.minStakeOpn} onChange={(e) => {
                const tiers = [...config.tiers];
                tiers[i] = { ...tier, minStakeOpn: e.target.value };
                setConfig({ ...config, tiers });
              }} />
            </div>
            <div>
              <Label>Fee discount (bps)</Label>
              <Input type="number" value={tier.creationFeeDiscountBps} onChange={(e) => {
                const tiers = [...config.tiers];
                tiers[i] = { ...tier, creationFeeDiscountBps: Number(e.target.value) };
                setConfig({ ...config, tiers });
              }} />
            </div>
            <div>
              <Label>Visibility multiplier (%)</Label>
              <Input type="number" value={tier.visibilityBoost} onChange={(e) => {
                const tiers = [...config.tiers];
                tiers[i] = { ...tier, visibilityBoost: Number(e.target.value) };
                setConfig({ ...config, tiers });
              }} />
            </div>
            <label className="flex items-center gap-2 text-sm pt-6">
              <input type="checkbox" checked={tier.rewardEligible} onChange={(e) => {
                const tiers = [...config.tiers];
                tiers[i] = { ...tier, rewardEligible: e.target.checked };
                setConfig({ ...config, tiers });
              }} />
              Future reward eligible
            </label>
          </CardContent>
        </Card>
      ))}
      <SaveButton saving={saving} onClick={async () => {
        setSaving(true);
        await adminFetch("/api/admin/settings/staking", { method: "PATCH", body: JSON.stringify({ config }) });
        setSaving(false);
      }} />
    </div>
  );
}

export function TrustPanelConfigSection() {
  const [config, setConfig] = useState<Record<string, boolean> | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    adminFetch("/api/admin/settings/trust-panel").then((r) => r.json()).then((d) => setConfig(d.config));
  }, []);
  if (!config) return null;
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Trust Panel Configuration</h2>
      <Card>
        <CardContent className="grid gap-3 pt-6 sm:grid-cols-2">
          {Object.entries(config).map(([key, val]) => (
            <label key={key} className="flex items-center gap-2 text-sm capitalize">
              <input
                type="checkbox"
                checked={val}
                onChange={(e) => setConfig({ ...config, [key]: e.target.checked })}
              />
              {key.replace(/([A-Z])/g, " $1").replace(/^show /, "")}
            </label>
          ))}
        </CardContent>
      </Card>
      <SaveButton saving={saving} onClick={async () => {
        setSaving(true);
        await adminFetch("/api/admin/settings/trust-panel", { method: "PATCH", body: JSON.stringify({ config }) });
        setSaving(false);
      }} />
    </div>
  );
}

export function V2PlatformSection() {
  const [tab, setTab] = useState<"flags" | "creators" | "quests" | "analytics">("flags");
  const [flags, setFlags] = useState<{ envDefaults: Record<string, boolean>; overrides: Record<string, boolean>; effective: Record<string, boolean> } | null>(null);
  const [v2Data, setV2Data] = useState<{ creators: { walletAddress: string; reputationScore: number; status: string; isFeatured: boolean }[]; quests: { id: string; title: string; status: string; completions: number }[]; analytics: { dailySnapshots: number; trustHistoryEntries: number } } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminFetch("/api/admin/settings/v2/feature-flags").then((r) => r.json()).then(setFlags);
    adminFetch("/api/admin/v2").then((r) => r.json()).then(setV2Data);
  }, []);

  const tabs = [
    { id: "flags" as const, label: "Feature Flags" },
    { id: "creators" as const, label: "Creator Management" },
    { id: "quests" as const, label: "Quest Management" },
    { id: "analytics" as const, label: "Analytics Overview" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">V2 Platform — Trust & Growth</h2>
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button key={t.id} variant={tab === t.id ? "default" : "outline"} size="sm" onClick={() => setTab(t.id)}>
            {t.label}
          </Button>
        ))}
      </div>

      {tab === "flags" && flags && (
        <Card>
          <CardHeader>
            <CardTitle>Feature Flags</CardTitle>
            <CardDescription>Override env defaults for V2 modules (visibility only — never blocks token creation).</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {Object.entries(flags.effective).map(([key, val]) => (
              <label key={key} className="flex items-center gap-2 text-sm capitalize">
                <input
                  type="checkbox"
                  checked={flags.overrides[key as keyof typeof flags.overrides] ?? val}
                  onChange={(e) =>
                    setFlags({
                      ...flags,
                      overrides: { ...flags.overrides, [key]: e.target.checked },
                    })
                  }
                />
                {key.replace(/([A-Z])/g, " $1")}
              </label>
            ))}
          </CardContent>
          <CardContent>
            <SaveButton
              saving={saving}
              onClick={async () => {
                setSaving(true);
                await adminFetch("/api/admin/settings/v2/feature-flags", {
                  method: "PATCH",
                  body: JSON.stringify({ overrides: flags.overrides }),
                });
                setSaving(false);
              }}
            />
          </CardContent>
        </Card>
      )}

      {tab === "creators" && v2Data && (
        <Card>
          <CardHeader><CardTitle>Creator Management</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {v2Data.creators.map((c) => (
              <div key={c.walletAddress} className="flex flex-wrap items-center justify-between gap-2 border-b py-2">
                <Link href={`/creator/${c.walletAddress}`} className="font-mono hover:text-primary">
                  {c.walletAddress.slice(0, 10)}…
                </Link>
                <span>Rep {c.reputationScore}</span>
                <Badge variant="outline">{c.status}</Badge>
                {c.isFeatured && <Badge>Featured</Badge>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {tab === "quests" && v2Data && (
        <Card>
          <CardHeader><CardTitle>Quest Management</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {v2Data.quests.map((q) => (
              <div key={q.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2">
                <span className="font-medium">{q.title}</span>
                <Badge variant="secondary">{q.status}</Badge>
                <span>{q.completions} completions</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {tab === "analytics" && v2Data && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Daily Snapshots Collected</p>
              <p className="text-2xl font-bold">{v2Data.analytics.dailySnapshots}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Trust Score History Entries</p>
              <p className="text-2xl font-bold">{v2Data.analytics.trustHistoryEntries}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export function AdminSectionRouter({ section }: { section: string }) {
  const { can } = useAdmin();
  const map: Record<string, { perm: Parameters<typeof can>[0]; Component: React.ComponentType }> = {
    overview: { perm: "overview", Component: OverviewSection },
    "creation-fees": { perm: "creation_fees", Component: CreationFeesSection },
    "trading-fees": { perm: "trading_fees", Component: TradingFeesSection },
    treasury: { perm: "treasury", Component: TreasurySection },
    verification: { perm: "verification", Component: VerificationSection },
    categories: { perm: "categories", Component: CategoriesSection },
    announcements: { perm: "announcements", Component: AnnouncementsModerationSection },
    staking: { perm: "staking", Component: StakingConfigSection },
    launchpool: { perm: "launchpool", Component: LaunchpoolAdminSection },
    "trust-panel": { perm: "trust_panel", Component: TrustPanelConfigSection },
    "v2-platform": { perm: "v2_platform", Component: V2PlatformSection },
    discovery: { perm: "discovery", Component: DiscoverySection },
    analytics: { perm: "analytics", Component: AnalyticsSection },
    "creator-earnings": { perm: "creator_earnings", Component: CreatorEarningsSection },
    "pool-share": { perm: "pool_share", Component: PoolShareSection },
    bridge: { perm: "bridge", Component: BridgeSection },
    security: { perm: "security", Component: SecuritySection },
    system: { perm: "system", Component: SystemSection },
    factory: { perm: "factory", Component: FactorySection },
    account: { perm: "overview", Component: AdminAccountSection },
    "activity-logs": { perm: "activity_logs", Component: ActivityLogsSection },
    roles: { perm: "roles", Component: RolesSection },
  };
  const entry = map[section] ?? map.overview;
  if (!can(entry.perm)) return <p className="text-muted-foreground">You do not have permission to view this section.</p>;
  const Comp = entry.Component;
  return <Comp />;
}
