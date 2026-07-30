"use client";

import { useEffect, useMemo, useState } from "react";
import { useActiveWallet } from "@/hooks/useActiveWallet";
import { Coins, Gift, Layers, RefreshCw, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWalletPortfolioBalance } from "@/hooks/dashboard/useWalletPortfolioBalance";
import { useUserDashboardSummary } from "@/hooks/dashboard/useUserDashboardSummary";
import { DashboardPortfolioChart } from "@/components/dashboard/dashboard-portfolio-chart";
import { formatBalanceTotal } from "@/lib/dashboard/wallet-balance";
import {
  computePortfolioChange,
  formatChangePercent,
  formatChangeUsd,
  recordPortfolioSnapshot,
  type PortfolioPoint,
} from "@/lib/dashboard/portfolio-history";

function MetricTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function DashboardBalancePanel() {
  const { walletAddress, hasWallet } = useActiveWallet();
  const { assets, totals, opnUsdRate, loading, refresh } = useWalletPortfolioBalance();
  const {
    pendingOpn,
    pendingRewardCount,
    loading: summaryLoading,
    refresh: refreshSummary,
  } = useUserDashboardSummary();
  const [history, setHistory] = useState<PortfolioPoint[]>([]);

  useEffect(() => {
    if (loading || !walletAddress) return;
    setHistory(recordPortfolioSnapshot(walletAddress, totals.usd));
  }, [loading, walletAddress, totals.usd]);

  const change = useMemo(
    () => computePortfolioChange(history, totals.usd, "24h"),
    [history, totals.usd]
  );

  const tokenCount = useMemo(() => assets.filter((a) => !a.isLp).length, [assets]);
  const lpCount = useMemo(() => assets.filter((a) => a.isLp).length, [assets]);
  const pendingUsd = pendingOpn * (opnUsdRate > 0 ? opnUsdRate : 0);

  if (!hasWallet || !walletAddress) return null;

  const changePositive = (change?.usd ?? 0) >= 0;

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="h-5 w-5 text-primary" />
          Net worth
        </CardTitle>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => {
            void refresh();
            void refreshSummary();
          }}
          disabled={loading}
          aria-label="Refresh balance"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
            {loading ? "…" : formatBalanceTotal(totals.usd, "USD")}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            {change ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-medium tabular-nums",
                  changePositive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {changePositive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {formatChangeUsd(change.usd)} ({formatChangePercent(change.percent)})
              </span>
            ) : (
              <span className="text-muted-foreground">24H change available after your next visit</span>
            )}
            {change && (
              <span className="text-xs text-muted-foreground">
                {change.partial
                  ? `since ${new Date(change.since).toLocaleString()}`
                  : "last 24 hours"}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading
              ? "Loading balances…"
              : `${formatBalanceTotal(totals.opn, "OPN")} across ${tokenCount + lpCount} holding${
                  tokenCount + lpCount === 1 ? "" : "s"
                }`}
          </p>
        </div>

        <DashboardPortfolioChart history={history} currentUsd={totals.usd} />

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <MetricTile
            icon={<Coins className="h-3.5 w-3.5" />}
            label="Tokens"
            value={loading ? "…" : String(tokenCount)}
          />
          <MetricTile
            icon={<Layers className="h-3.5 w-3.5" />}
            label="LP positions"
            value={loading ? "…" : String(lpCount)}
          />
          <MetricTile
            icon={<Gift className="h-3.5 w-3.5" />}
            label="Rewards pending"
            value={summaryLoading ? "…" : String(pendingRewardCount)}
            hint={pendingUsd > 0 ? `≈ ${formatBalanceTotal(pendingUsd, "USD")}` : undefined}
          />
        </div>

        {!loading && totals.usd <= 0 && (
          <p className="text-sm text-muted-foreground">
            No token balances detected in this wallet yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
