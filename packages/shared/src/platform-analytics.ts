export type AnalyticsRange = "24h" | "7d" | "30d" | "90d" | "all";

export type AnalyticsLaunchSort =
  | "newest"
  | "views"
  | "liquidity"
  | "trust";

export type AnalyticsRankingCategory =
  | "trending"
  | "views"
  | "traded"
  | "liquidity"
  | "marketCap"
  | "growing"
  | "holders"
  | "trust"
  | "updated"
  | "favorited";

export type MarketSentiment = "bullish" | "neutral" | "bearish";

export type ChartPoint = { t: string; v: number };

export type AnalyticsTokenRow = {
  rank: number;
  id: string;
  contractAddress: string;
  name: string;
  symbol: string;
  logoUrl: string | null;
  creatorAddress: string;
  creatorUsername: string | null;
  category: string;
  trustScore: number;
  holderCount: number;
  viewCount: number;
  volume24h: number;
  volumeTotal: number;
  poolStrength: number;
  marketCapEstimate: number;
  priceEstimate: number;
  change24h: number;
  liquidityLocked: boolean;
  verificationStatus: string;
  createdAt: string;
  updatedAt: string;
  status: "active" | "new" | "verified" | "trending";
  favoriteCount: number;
};

export type PlatformOverviewMetrics = {
  totalTokensCreated: number;
  activeTokens: number;
  verifiedProjects: number;
  trustedProjects: number;
  totalHolders: number;
  totalTransactions: number;
  totalLiquidityOpn: number;
  volume24h: number;
  totalCreators: number;
  activeQuests: number;
  changes: {
    h24: Record<string, number | null>;
    d7: Record<string, number | null>;
    d30: Record<string, number | null>;
  };
};

export type MarketOverviewMetrics = {
  totalMarketCap: number;
  volume24h: number;
  totalLiquidity: number;
  averageTokenPrice: number;
  averageTrustScore: number;
  averageHolderCount: number;
  averageDailyTransactions: number;
  bestPerformingCategory: string | null;
  sentiment: MarketSentiment;
};

export type LiquidityDashboardMetrics = {
  totalLiquidityLocked: number;
  totalLiquidityAdded: number;
  liquidityAddedToday: number;
  liquidityRemovedToday: number;
  largestPools: { name: string; symbol: string; liquidity: number; poolAddress: string }[];
  recentLocks: { tokenSymbol: string; amount: string; unlockAt: string; createdAt: string }[];
  recentUnlocks: { tokenSymbol: string; amount: string; unlockAt: string }[];
};

export type TradingActivityMetrics = {
  volume24h: number;
  volume7d: number;
  volume30d: number;
  transactionCount24h: number;
  averageTradeSize: number;
  largestTrades: {
    tokenAddress: string;
    tokenSymbol: string | null;
    traderAddress: string;
    volumeOpn: number;
    blockTime: string;
    txHash: string;
  }[];
  mostActiveTokens: AnalyticsTokenRow[];
  mostTradedTokens: AnalyticsTokenRow[];
};

export type HolderGrowthMetrics = {
  totalHolders: number;
  newHoldersToday: number;
  newHoldersThisWeek: number;
  fastestGrowing: AnalyticsTokenRow[];
  highestRetention: AnalyticsTokenRow[];
  largestIncrease: AnalyticsTokenRow[];
};

export type PlatformCharts = {
  marketCapTrend: ChartPoint[];
  volumeTrend: ChartPoint[];
  liquidityTrend: ChartPoint[];
  tokenCreationTrend: ChartPoint[];
  holderGrowthTrend: ChartPoint[];
  trustScoreDistribution: { bucket: string; count: number }[];
  categoryBreakdown: { category: string; count: number }[];
  creatorActivity: ChartPoint[];
  hourlyVolume: ChartPoint[];
};

export type PlatformAnalyticsPayload = {
  updatedAt: string;
  range: AnalyticsRange;
  platformOverview: PlatformOverviewMetrics;
  marketOverview: MarketOverviewMetrics;
  newLaunches: AnalyticsTokenRow[];
  liquidity: LiquidityDashboardMetrics;
  trading: TradingActivityMetrics;
  holders: HolderGrowthMetrics;
  rankings: Partial<Record<AnalyticsRankingCategory, AnalyticsTokenRow[]>>;
  charts: PlatformCharts;
};

export const ANALYTICS_RANGES: { id: AnalyticsRange; label: string }[] = [
  { id: "24h", label: "24H" },
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "90d", label: "90D" },
  { id: "all", label: "All" },
];

export const ANALYTICS_LAUNCH_SORTS: { id: AnalyticsLaunchSort; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "views", label: "Most Viewed" },
  { id: "liquidity", label: "Highest Liquidity" },
  { id: "trust", label: "Highest Trust" },
];

export const ANALYTICS_RANKING_TABS: { id: AnalyticsRankingCategory; label: string }[] = [
  { id: "trending", label: "Trending" },
  { id: "views", label: "Most Viewed" },
  { id: "traded", label: "Most Traded" },
  { id: "liquidity", label: "Highest Liquidity" },
  { id: "marketCap", label: "Highest Market Cap" },
  { id: "growing", label: "Fastest Growing" },
  { id: "holders", label: "Most Holders" },
  { id: "trust", label: "Highest Trust" },
  { id: "updated", label: "Recently Updated" },
  { id: "favorited", label: "Most Favorited" },
];
