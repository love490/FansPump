import {
  DEFAULT_STAKING_PLATFORM_CONFIG,
  type StakingPlatformConfig,
} from "@iopn/shared";
import { prisma } from "@iopn/database";

export const STAKING_CONFIG_KEY = "staking";

export async function getStakingPlatformConfig(): Promise<StakingPlatformConfig> {
  const row = await prisma.platformSetting.findUnique({ where: { key: STAKING_CONFIG_KEY } });
  if (!row?.value || typeof row.value !== "object") {
    return DEFAULT_STAKING_PLATFORM_CONFIG;
  }
  return { ...DEFAULT_STAKING_PLATFORM_CONFIG, ...(row.value as StakingPlatformConfig) };
}

export function serializeStakingPosition(position: {
  id: string;
  assetType: string;
  asset: string;
  amount: string;
  poolAddress: string | null;
  tokenAddress: string | null;
  tier: string | null;
  stakedAt: Date;
}) {
  const stakingType = position.assetType === "OPN" ? ("OPN" as const) : ("LP" as const);
  return {
    id: position.id,
    stakingType,
    assetType: position.assetType,
    asset: position.asset,
    amount: position.amount,
    poolAddress: position.poolAddress,
    tokenAddress: position.tokenAddress,
    tier: position.tier,
    stakedAt: position.stakedAt.toISOString(),
  };
}
