export type LaunchpoolStatus = "ACTIVE" | "ONGOING" | "ENDED";

export type LaunchpoolStakeAssetInput = {
  assetType: string;
  assetAddress?: string | null;
  assetSymbol: string;
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
  return `Stake ${stakeAssetsLabel(pool.stakeAssets)} to earn ${pool.rewardTokenSymbol}`;
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
  durationLabel: string | null;
  isPublished: boolean;
  rewardsDistributed: boolean;
  stakeAssets: LaunchpoolStakeAssetInput[];
};

type LaunchpoolStats = {
  totalStakedAmount: string;
  participantCount: number;
};

export function serializeLaunchpool(
  pool: LaunchpoolRecord,
  stats?: LaunchpoolStats
): SerializedLaunchpool {
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
    durationLabel: pool.durationLabel,
    isPublished: pool.isPublished,
    rewardsDistributed: pool.rewardsDistributed,
    stakeAssets: pool.stakeAssets.map((asset) => ({
      assetType: asset.assetType,
      assetAddress: asset.assetAddress ?? null,
      assetSymbol: asset.assetSymbol,
    })),
    totalStakedAmount: stats?.totalStakedAmount ?? "0",
    participantCount: stats?.participantCount ?? 0,
  };
}
