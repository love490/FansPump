export const STAKING_TIERS = ["BRONZE", "SILVER", "GOLD", "PLATINUM"] as const;

export type StakingTierId = (typeof STAKING_TIERS)[number];

export const STAKING_TIER_LABELS: Record<StakingTierId, string> = {
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
  PLATINUM: "Platinum",
};

export type StakingTierConfig = {
  tier: StakingTierId;
  minStakeOpn: string;
  creationFeeDiscountBps: number;
  visibilityBoost: number;
  rewardEligible: boolean;
};

export const DEFAULT_STAKING_TIERS: StakingTierConfig[] = [
  { tier: "BRONZE", minStakeOpn: "100", creationFeeDiscountBps: 0, visibilityBoost: 0, rewardEligible: false },
  { tier: "SILVER", minStakeOpn: "500", creationFeeDiscountBps: 500, visibilityBoost: 5, rewardEligible: true },
  { tier: "GOLD", minStakeOpn: "2000", creationFeeDiscountBps: 1000, visibilityBoost: 15, rewardEligible: true },
  { tier: "PLATINUM", minStakeOpn: "10000", creationFeeDiscountBps: 2000, visibilityBoost: 30, rewardEligible: true },
];

export type StakingType = "OPN" | "LP";

export type SupportedLpPool = {
  id: string;
  label: string;
  token0: string;
  token1: string;
  poolAddress?: string;
  enabled: boolean;
};

export type StakingPlatformConfig = {
  tiers: StakingTierConfig[];
  visibilityBoostEnabled: boolean;
  discoveryRankingBoostEnabled: boolean;
  opnStakingEnabled: boolean;
  lpStakingEnabled: boolean;
  supportedLpPools: SupportedLpPool[];
};

export const DEFAULT_SUPPORTED_LP_POOLS: SupportedLpPool[] = [
  {
    id: "opn-usdt",
    label: "OPN/USDT",
    token0: "native",
    token1: "usdt",
    enabled: true,
  },
  {
    id: "opn-usdc",
    label: "OPN/USDC",
    token0: "native",
    token1: "usdc",
    enabled: false,
  },
  {
    id: "opn-token",
    label: "OPN/Token",
    token0: "native",
    token1: "any",
    enabled: true,
  },
];

export const DEFAULT_STAKING_PLATFORM_CONFIG: StakingPlatformConfig = {
  tiers: DEFAULT_STAKING_TIERS,
  visibilityBoostEnabled: true,
  discoveryRankingBoostEnabled: true,
  opnStakingEnabled: true,
  lpStakingEnabled: true,
  supportedLpPools: DEFAULT_SUPPORTED_LP_POOLS,
};

export type PoolPairType =
  | "OPN_USDT"
  | "OPN_USDC"
  | "OPN_WOPN"
  | "OPN_TOKEN"
  | "OTHER";

export type PoolRecord = {
  poolAddress: string;
  token0: string;
  token1: string;
  token0Symbol?: string | null;
  token1Symbol?: string | null;
  pairType: PoolPairType;
  totalLiquidity: string;
  totalVolume: string;
  providerCount: number;
  createdAt: string;
  updatedAt: string;
  indexedAt?: string | null;
};
