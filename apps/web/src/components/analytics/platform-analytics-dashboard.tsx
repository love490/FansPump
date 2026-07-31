"use client";

import { useMemo, useState } from "react";
import {
  ANALYTICS_LAUNCH_SORTS,
  ANALYTICS_RANGES,
  ANALYTICS_RANKING_TABS,
  TOKEN_CATEGORIES,
  type AnalyticsLaunchSort,
  type AnalyticsRange,
  type AnalyticsRankingCategory,
} from "@iopn/shared";
import { AnalyticsLineChart, AnalyticsBarChart } from "@/components/analytics/analytics-charts";
import {
  AnalyticsEmpty,
  AnalyticsSection,
  AnalyticsStatCard,
} from "@/components/analytics/analytics-ui";
import {
  AnalyticsLaunchCard,
  AnalyticsTokenTable,
} from "@/components/analytics/analytics-token-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePlatformAnalytics } from "@/hooks/analytics/usePlatformAnalytics";
import { formatCompactUsd } from "@/lib/dashboard/wallet-balance";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";

const SENTIMENT_STYLE = {
  bullish: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  neutral: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  bearish: "bg-red-500/15 text-red-700 dark:text-red-400",
} as const;

function formatNum(n: number, suffix = ""): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M${suffix}`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K${suffix}`;
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`;
}

export function PlatformAnalyticsDashboard() {
  const [range, setRange] = useState<AnalyticsRange>("7d");
  const [launchSort, setLaunchSort] = useState<AnalyticsLaunchSort>("newest");
  const [rankingTab, setRankingTab] = useState<AnalyticsRankingCategory>("trending");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const filters = useMemo(
    () => ({
      q: search.trim() || undefined,
      category: category || undefined,
      verified: verifiedOnly || undefined,
    }),
    [search, category, verifiedOnly]
  );

  const { data, loading, error, refresh } = usePlatformAnalytics(range, launchSort, filters);

  const rankingTokens = data?.rankings?.[rankingTab] ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
              <BarChart3 className="h-8 w-8 text-primary" />
              Analytics
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Real-time intelligence for the FansPump ecosystem — platform health, market activity,
              liquidity, trading, holders, and token rankings.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {data?.updatedAt && (
              <p className="text-xs text-muted-foreground">
                Updated {new Date(data.updatedAt).toLocaleTimeString()}
              </p>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>
              <RefreshCw className={cn("mr-1 h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects, tokens, creators…"
              className="pl-9"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All categories</option>
            {TOKEN_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant={verifiedOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setVerifiedOnly((v) => !v)}
          >
            Verified only
          </Button>
          <div className="flex flex-wrap gap-1">
            {ANALYTICS_RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRange(r.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  range === r.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading analytics…
        </div>
      ) : data ? (
        <div className="space-y-12">
          {/* Platform Overview */}
          <AnalyticsSection
            id="overview"
            title="Platform Overview"
            description="Ecosystem-wide health and growth metrics."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <AnalyticsStatCard
                label="Total Tokens Created"
                value={formatNum(data.platformOverview.totalTokensCreated)}
                change={data.platformOverview.changes.d7.totalTokensCreated}
                changePeriod="7d"
              />
              <AnalyticsStatCard
                label="Active Tokens"
                value={formatNum(data.platformOverview.activeTokens)}
                change={data.platformOverview.changes.d7.activeTokens}
                changePeriod="7d"
              />
              <AnalyticsStatCard
                label="Verified Projects"
                value={formatNum(data.platformOverview.verifiedProjects)}
              />
              <AnalyticsStatCard
                label="Trusted Projects"
                value={formatNum(data.platformOverview.trustedProjects)}
              />
              <AnalyticsStatCard
                label="Total Holders"
                value={formatNum(data.platformOverview.totalHolders)}
                change={data.platformOverview.changes.d7.totalHolders}
                changePeriod="7d"
              />
              <AnalyticsStatCard
                label="Total Transactions"
                value={formatNum(data.platformOverview.totalTransactions)}
              />
              <AnalyticsStatCard
                label="Total Liquidity"
                value={`${formatNum(data.platformOverview.totalLiquidityOpn)} OPN`}
                change={data.platformOverview.changes.d7.totalLiquidityOpn}
                changePeriod="7d"
              />
              <AnalyticsStatCard
                label="24H Trading Volume"
                value={`${formatNum(data.platformOverview.volume24h)} OPN`}
                change={data.platformOverview.changes.d7.volume24h}
                changePeriod="7d"
              />
              <AnalyticsStatCard
                label="Total Creators"
                value={formatNum(data.platformOverview.totalCreators)}
              />
              <AnalyticsStatCard
                label="Active Quests"
                value={formatNum(data.platformOverview.activeQuests)}
              />
            </div>
          </AnalyticsSection>

          {/* Market Overview */}
          <AnalyticsSection
            id="market"
            title="Market Overview"
            description="Overall ecosystem performance and sentiment."
          >
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Sentiment</span>
              <Badge className={SENTIMENT_STYLE[data.marketOverview.sentiment]}>
                {data.marketOverview.sentiment}
              </Badge>
              {data.marketOverview.bestPerformingCategory && (
                <Badge variant="outline">
                  Top category: {data.marketOverview.bestPerformingCategory}
                </Badge>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <AnalyticsStatCard
                label="Total Market Cap"
                value={formatCompactUsd(data.marketOverview.totalMarketCap)}
              />
              <AnalyticsStatCard
                label="24H Volume"
                value={`${formatNum(data.marketOverview.volume24h)} OPN`}
              />
              <AnalyticsStatCard
                label="Total Liquidity"
                value={`${formatNum(data.marketOverview.totalLiquidity)} OPN`}
              />
              <AnalyticsStatCard
                label="Avg Trust Score"
                value={String(data.marketOverview.averageTrustScore)}
              />
              <AnalyticsStatCard
                label="Avg Holders / Token"
                value={formatNum(data.marketOverview.averageHolderCount)}
              />
              <AnalyticsStatCard
                label="Avg Daily Transactions"
                value={formatNum(data.marketOverview.averageDailyTransactions)}
              />
              <AnalyticsStatCard
                label="Avg Token Price"
                value={data.marketOverview.averageTokenPrice.toFixed(6)}
              />
            </div>
          </AnalyticsSection>

          {/* New Launches */}
          <AnalyticsSection
            id="launches"
            title="New Launches"
            description="Recently created projects on FansPump."
            action={
              <div className="flex flex-wrap gap-1">
                {ANALYTICS_LAUNCH_SORTS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setLaunchSort(s.id)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium",
                      launchSort === s.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            }
          >
            {data.newLaunches.length === 0 ? (
              <AnalyticsEmpty message="No recent launches match your filters." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.newLaunches.map((token) => (
                  <AnalyticsLaunchCard key={token.id} token={token} />
                ))}
              </div>
            )}
          </AnalyticsSection>

          {/* Liquidity */}
          <AnalyticsSection
            id="liquidity"
            title="Liquidity Dashboard"
            description="Liquidity depth, locks, and pool activity."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <AnalyticsStatCard
                label="Liquidity Locked"
                value={`${formatNum(data.liquidity.totalLiquidityLocked)} LP`}
              />
              <AnalyticsStatCard
                label="Total Liquidity Added"
                value={`${formatNum(data.liquidity.totalLiquidityAdded)} OPN`}
              />
              <AnalyticsStatCard
                label="Added Today"
                value={`${formatNum(data.liquidity.liquidityAddedToday)} LP`}
              />
              <AnalyticsStatCard
                label="Removed Today"
                value={`${formatNum(data.liquidity.liquidityRemovedToday)} LP`}
              />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <AnalyticsLineChart title="Liquidity Growth" points={data.charts.liquidityTrend} />
              <AnalyticsBarChart
                title="Liquidity by Project (pools)"
                items={data.liquidity.largestPools.map((p) => ({
                  label: p.name,
                  value: p.liquidity,
                }))}
              />
            </div>
            {data.liquidity.largestPools.length === 0 && (
              <AnalyticsEmpty message="No liquidity data available yet." />
            )}
          </AnalyticsSection>

          {/* Trading */}
          <AnalyticsSection
            id="trading"
            title="Trading Activity"
            description="Volume, trades, and most active tokens."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <AnalyticsStatCard label="24H Volume" value={`${formatNum(data.trading.volume24h)} OPN`} />
              <AnalyticsStatCard label="7D Volume" value={`${formatNum(data.trading.volume7d)} OPN`} />
              <AnalyticsStatCard label="30D Volume" value={`${formatNum(data.trading.volume30d)} OPN`} />
              <AnalyticsStatCard
                label="Avg Trade Size"
                value={`${formatNum(data.trading.averageTradeSize)} OPN`}
              />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <AnalyticsLineChart title="Volume Trend" points={data.charts.volumeTrend} valuePrefix="" />
              <AnalyticsLineChart
                title="Hourly Trading Volume (24H)"
                points={data.charts.hourlyVolume}
              />
            </div>
            {data.trading.largestTrades.length > 0 ? (
              <div className="mt-4 overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                      <th className="px-3 py-2">Token</th>
                      <th className="px-3 py-2">Volume</th>
                      <th className="px-3 py-2">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.trading.largestTrades.map((t) => (
                      <tr key={t.txHash} className="border-b last:border-0">
                        <td className="px-3 py-2">${t.tokenSymbol ?? "—"}</td>
                        <td className="px-3 py-2 tabular-nums">{t.volumeOpn.toFixed(4)} OPN</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {new Date(t.blockTime).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <AnalyticsEmpty message="No trading activity yet." />
            )}
            {data.trading.mostTradedTokens.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 text-sm font-medium">Most Traded Tokens</h3>
                <AnalyticsTokenTable tokens={data.trading.mostTradedTokens} compact />
              </div>
            )}
          </AnalyticsSection>

          {/* Holders */}
          <AnalyticsSection
            id="holders"
            title="Holder Growth"
            description="Community growth and retention signals."
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <AnalyticsStatCard
                label="Total Holders"
                value={formatNum(data.holders.totalHolders)}
              />
              <AnalyticsStatCard
                label="New Holders Today"
                value={formatNum(data.holders.newHoldersToday)}
              />
              <AnalyticsStatCard
                label="New This Week"
                value={formatNum(data.holders.newHoldersThisWeek)}
              />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <AnalyticsLineChart title="Holder Growth" points={data.charts.holderGrowthTrend} />
              <AnalyticsBarChart
                title="Fastest Growing Projects"
                items={data.holders.fastestGrowing.map((t) => ({
                  label: `$${t.symbol}`,
                  value: t.holderCount,
                }))}
              />
            </div>
          </AnalyticsSection>

          {/* Rankings */}
          <AnalyticsSection
            id="rankings"
            title="Token Rankings"
            description="Leaderboards across trending, volume, trust, and more."
            action={
              <div className="flex max-w-full gap-1 overflow-x-auto pb-1">
                {ANALYTICS_RANKING_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setRankingTab(tab.id)}
                    className={cn(
                      "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium",
                      rankingTab === tab.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            }
          >
            {rankingTokens.length === 0 ? (
              <AnalyticsEmpty message="No tokens ranked for this category yet." />
            ) : (
              <AnalyticsTokenTable tokens={rankingTokens} />
            )}
          </AnalyticsSection>

          {/* Charts */}
          <AnalyticsSection
            id="charts"
            title="Charts"
            description="Historical trends across the ecosystem."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <AnalyticsLineChart title="Market Cap Trend" points={data.charts.marketCapTrend} />
              <AnalyticsLineChart title="Token Creation Trend" points={data.charts.tokenCreationTrend} />
              <AnalyticsBarChart
                title="Trust Score Distribution"
                items={data.charts.trustScoreDistribution.map((b) => ({
                  label: b.bucket,
                  value: b.count,
                }))}
              />
              <AnalyticsBarChart
                title="Project Categories"
                items={data.charts.categoryBreakdown.map((c) => ({
                  label: c.category,
                  value: c.count,
                }))}
              />
            </div>
          </AnalyticsSection>

          <p className="border-t border-border pt-6 text-center text-xs text-muted-foreground">
            Reserved for future: cross-chain analytics, AI insights, whale tracking, custom dashboards.
          </p>
        </div>
      ) : null}
    </div>
  );
}
