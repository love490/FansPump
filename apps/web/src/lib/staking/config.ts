import {
  DEFAULT_STAKING_PLATFORM_CONFIG,
  type StakingPlatformConfig,
  type StakingTierConfig,
  type StakingTierId,
} from "@iopn/shared";
import { getPlatformSetting } from "@/lib/admin/platform-settings";

export const STAKING_CONFIG_KEY = "staking_config";

export async function getStakingPlatformConfig(): Promise<StakingPlatformConfig> {
  return getPlatformSetting(STAKING_CONFIG_KEY, DEFAULT_STAKING_PLATFORM_CONFIG);
}

export function resolveStakingTier(
  totalOpnWei: bigint,
  tiers: StakingTierConfig[]
): StakingTierId | null {
  const sorted = [...tiers].sort(
    (a, b) => Number(parseMinStakeWei(b.minStakeOpn) - parseMinStakeWei(a.minStakeOpn))
  );

  for (const tier of sorted) {
    if (totalOpnWei >= parseMinStakeWei(tier.minStakeOpn)) return tier.tier;
  }
  return null;
}

export function parseMinStakeWei(minStakeOpn: string): bigint {
  const trimmed = minStakeOpn.trim();
  if (!trimmed) return 0n;
  if (trimmed.includes(".")) {
    const [whole, frac = ""] = trimmed.split(".");
    const padded = `${whole}${frac.padEnd(18, "0").slice(0, 18)}`;
    return BigInt(padded || "0");
  }
  return BigInt(trimmed) * 10n ** 18n;
}

export function serializeStakingPosition(position: {
  id: string;
  wallet: string;
  assetType: string;
  asset: string;
  amount: string;
  poolAddress: string | null;
  tokenAddress: string | null;
  tier: string | null;
  stakedAt: Date;
  unstakedAt: Date | null;
  isActive: boolean;
  updatedAt: Date;
}) {
  return {
    id: position.id,
    wallet: position.wallet,
    stakingType: position.assetType === "LP_TOKEN" ? "LP" : "OPN",
    assetType: position.assetType,
    asset: position.asset,
    amount: position.amount,
    poolAddress: position.poolAddress,
    tokenAddress: position.tokenAddress,
    tier: position.tier,
    stakedAt: position.stakedAt.toISOString(),
    unstakedAt: position.unstakedAt?.toISOString() ?? null,
    isActive: position.isActive,
    createdAt: position.stakedAt.toISOString(),
    updatedAt: position.updatedAt.toISOString(),
  };
}
