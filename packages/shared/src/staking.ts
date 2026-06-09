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
