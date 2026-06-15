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
  pool: Pick<SerializedLaunchpool, "totalRewardUsd" | "stakeAssets">
): string {
  return `Get a share of $${pool.totalRewardUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })} by staking ${stakeAssetsLabel(pool.stakeAssets)}`;
}

export const LAUNCHPOOL_STAKE_PREFIX = "FansPump Launchpool Stake";
export const LAUNCHPOOL_UNSTAKE_PREFIX = "FansPump Launchpool Unstake";
