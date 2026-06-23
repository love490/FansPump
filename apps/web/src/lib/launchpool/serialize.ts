import { formatUnits } from "viem";

export type LaunchpoolStatus = "ACTIVE" | "ONGOING" | "ENDED";

export type LaunchpoolStakeAssetInput = {
  assetType: string;
  assetAddress?: string | null;
  assetSymbol: string;
  totalStakedAmount?: string;
  participantCount?: number;
};

export type SerializedLaunchpool = {
  id: string;
  title: string;
  description: string;
  detailInfo: string;
  status: LaunchpoolStatus;
  rewardTokenSymbol: string;
  rewardTokenAddress: string | null;
  totalRewardUsd: number;
  totalRewardAmount: string;
  minStakeAmount: string;
  maxStakeAmount: string | null;
  startAt: string;
  endAt: string;
  listingAt: string | null;
  durationLabel: string | null;
  isPublished: boolean;
  rewardsDistributed: boolean;
  stakeAssets: LaunchpoolStakeAssetInput[];
  totalStakedAmount: string;
  participantCount: number;
};

export function stakeAssetsLabel(assets: LaunchpoolStakeAssetInput[]): string {
  const symbols = assets.map((a) => a.assetSymbol);
  if (symbols.length <= 1) return symbols[0] ?? "tokens";
  if (symbols.length === 2) return `${symbols[0]} or ${symbols[1]}`;
  return `${symbols.slice(0, -1).join(", ")}, or ${symbols[symbols.length - 1]}`;
}

export function launchpoolHeadline(
  pool: Pick<SerializedLaunchpool, "totalRewardUsd" | "stakeAssets" | "rewardTokenSymbol">
): string {
  if (pool.totalRewardUsd > 0) {
    return `Get a share of $${pool.totalRewardUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })} by staking ${stakeAssetsLabel(pool.stakeAssets)}`;
  }
  return `Stake ${stakeAssetsLabel(pool.stakeAssets)} to earn ${formatTokenTicker(pool.rewardTokenSymbol)}`;
}

/** Ticker with a single leading $ (e.g. LOVE → $LOVE, $LOVE → $LOVE). */
export function formatTokenTicker(symbol: string): string {
  const base = symbol.trim().replace(/^\$+/, "");
  return base ? `$${base}` : "";
}

/** Symbol without a leading $ for amount suffixes (e.g. "10,000 LOVE"). */
export function formatTokenTickerPlain(symbol: string): string {
  return symbol.trim().replace(/^\$+/, "");
}

export function formatLaunchpoolPrize(pool: Pick<SerializedLaunchpool, "totalRewardUsd" | "totalRewardAmount" | "rewardTokenSymbol">): string {
  const ticker = formatTokenTickerPlain(pool.rewardTokenSymbol);
  if (BigInt(pool.totalRewardAmount || "0") > 0n) {
    try {
      const formatted = Number(formatUnits(BigInt(pool.totalRewardAmount), 18));
      return `${formatted.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${ticker}`;
    } catch {
      return `${pool.totalRewardAmount} ${ticker}`;
    }
  }
  if (pool.totalRewardUsd > 0) {
    return `$${pool.totalRewardUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }
  return "TBA";
}

export function formatTokenWei(wei: string): string {
  try {
    return Number(formatUnits(BigInt(wei || "0"), 18)).toLocaleString(undefined, {
      maximumFractionDigits: 4,
    });
  } catch {
    return wei;
  }
}

export function formatUtcRange(start: string, end: string): string {
  const fmt = (d: Date) => {
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const min = String(d.getUTCMinutes()).padStart(2, "0");
    return `${mm}-${dd} ${hh}:${min}`;
  };
  return `${fmt(new Date(start))} ~ ${fmt(new Date(end))} UTC`;
}

export function formatListingTime(pool: Pick<SerializedLaunchpool, "listingAt" | "startAt">): string {
  const value = pool.listingAt ?? pool.startAt;
  return `${new Date(value).toISOString().replace("T", " ").slice(0, 19)} UTC`;
}

export function assetKey(asset: LaunchpoolStakeAssetInput): string {
  return `${asset.assetSymbol}-${asset.assetAddress ?? "native"}`;
}

export const LAUNCHPOOL_STAKE_PREFIX = "FansPump Launchpool Stake";
export const LAUNCHPOOL_UNSTAKE_PREFIX = "FansPump Launchpool Unstake";

type LaunchpoolRecord = {
  id: string;
  title: string;
  description: string;
  detailInfo: string;
  status: LaunchpoolStatus;
  rewardTokenSymbol: string;
  rewardTokenAddress: string | null;
  totalRewardUsd: number;
  totalRewardAmount: string;
  minStakeAmount: string;
  maxStakeAmount: string | null;
  startAt: Date;
  endAt: Date;
  listingAt: Date | null;
  durationLabel: string | null;
  isPublished: boolean;
  rewardsDistributed: boolean;
  stakeAssets: LaunchpoolStakeAssetInput[];
};

type LaunchpoolStats = {
  totalStakedAmount: string;
  participantCount: number;
  assetStats?: Array<{
    assetSymbol: string;
    assetAddress: string | null;
    totalStakedAmount: string;
    participantCount: number;
  }>;
};

function assetStatsKey(assetSymbol: string, assetAddress: string | null): string {
  return `${assetSymbol.toUpperCase()}::${(assetAddress ?? "").toLowerCase()}`;
}

export function serializeLaunchpool(
  pool: LaunchpoolRecord,
  stats?: LaunchpoolStats
): SerializedLaunchpool {
  const assetStatsMap = new Map(
    (stats?.assetStats ?? []).map((item) => [
      assetStatsKey(item.assetSymbol, item.assetAddress),
      item,
    ])
  );

  return {
    id: pool.id,
    title: pool.title,
    description: pool.description,
    detailInfo: pool.detailInfo,
    status: pool.status,
    rewardTokenSymbol: pool.rewardTokenSymbol,
    rewardTokenAddress: pool.rewardTokenAddress,
    totalRewardUsd: pool.totalRewardUsd,
    totalRewardAmount: pool.totalRewardAmount,
    minStakeAmount: pool.minStakeAmount,
    maxStakeAmount: pool.maxStakeAmount ?? null,
    startAt: pool.startAt.toISOString(),
    endAt: pool.endAt.toISOString(),
    listingAt: pool.listingAt?.toISOString() ?? null,
    durationLabel: pool.durationLabel,
    isPublished: pool.isPublished,
    rewardsDistributed: pool.rewardsDistributed,
    stakeAssets: pool.stakeAssets.map((asset) => {
      const stat = assetStatsMap.get(assetStatsKey(asset.assetSymbol, asset.assetAddress ?? null));
      return {
        assetType: asset.assetType,
        assetAddress: asset.assetAddress ?? null,
        assetSymbol: asset.assetSymbol,
        totalStakedAmount: stat?.totalStakedAmount ?? "0",
        participantCount: stat?.participantCount ?? 0,
      };
    }),
    totalStakedAmount: stats?.totalStakedAmount ?? "0",
    participantCount: stats?.participantCount ?? 0,
  };
}
