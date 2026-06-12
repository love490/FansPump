import { TOKEN_FEATURES, hasFeature } from "@iopn/shared";
import type { TokenVerificationStatus } from "@iopn/database";

export type TrustRiskLevel = "excellent" | "good" | "moderate" | "high";

export type TrustScoreBreakdownItem = {
  factor: string;
  label: string;
  points: number;
  maxPoints: number;
  status: "pass" | "warn" | "fail" | "neutral";
  detail: string;
};

export type TrustScoreResult = {
  score: number;
  riskLevel: TrustRiskLevel;
  riskLabel: string;
  breakdown: TrustScoreBreakdownItem[];
};

export type TrustScoreInput = {
  featureFlags: number | bigint;
  ownershipRenounced: boolean;
  liquidityLocked: boolean;
  liquidityBurned: boolean;
  verificationStatus: TokenVerificationStatus;
  creatorVerified: boolean;
  creatorReputation?: number;
  isScam?: boolean;
};

export const DEFAULT_TRUST_WEIGHTS = {
  ownershipRenounced: 20,
  liquidityLocked: 15,
  liquidityBurned: 18,
  contractVerified: 15,
  mintDisabled: 10,
  blacklistDisabled: 10,
  tradingEnabled: 5,
  creatorVerified: 5,
  creatorHistoryMax: 10,
} as const;

export function getTrustRiskLevel(score: number): TrustRiskLevel {
  if (score >= 90) return "excellent";
  if (score >= 75) return "good";
  if (score >= 50) return "moderate";
  return "high";
}

export function getTrustRiskLabel(level: TrustRiskLevel): string {
  switch (level) {
    case "excellent":
      return "Excellent";
    case "good":
      return "Good";
    case "moderate":
      return "Moderate";
    case "high":
      return "High Risk";
  }
}

export function computeTrustScore(
  input: TrustScoreInput,
  weights: typeof DEFAULT_TRUST_WEIGHTS = DEFAULT_TRUST_WEIGHTS
): TrustScoreResult {
  const flags = Number(input.featureFlags);
  const mintEnabled = hasFeature(flags, TOKEN_FEATURES.MINTABLE);
  const blacklistEnabled = hasFeature(flags, TOKEN_FEATURES.BLACKLIST);
  const tradingSwitch = hasFeature(flags, TOKEN_FEATURES.TRADING_SWITCH);
  const contractVerified = input.verificationStatus === "APPROVED";

  const breakdown: TrustScoreBreakdownItem[] = [];

  const ownershipPts = input.ownershipRenounced ? weights.ownershipRenounced : 0;
  breakdown.push({
    factor: "ownership",
    label: "Ownership Status",
    points: ownershipPts,
    maxPoints: weights.ownershipRenounced,
    status: input.ownershipRenounced ? "pass" : "warn",
    detail: input.ownershipRenounced ? "Ownership renounced" : "Active owner",
  });

  let liquidityPts = 0;
  let liquidityDetail = "Unlocked";
  let liquidityStatus: TrustScoreBreakdownItem["status"] = "fail";
  if (input.liquidityBurned) {
    liquidityPts = weights.liquidityBurned;
    liquidityDetail = "Liquidity burned";
    liquidityStatus = "pass";
  } else if (input.liquidityLocked) {
    liquidityPts = weights.liquidityLocked;
    liquidityDetail = "Liquidity locked";
    liquidityStatus = "pass";
  }
  breakdown.push({
    factor: "liquidity",
    label: "Liquidity Status",
    points: liquidityPts,
    maxPoints: weights.liquidityBurned,
    status: liquidityStatus,
    detail: liquidityDetail,
  });

  const verifiedPts = contractVerified ? weights.contractVerified : 0;
  breakdown.push({
    factor: "contract",
    label: "Contract Verification",
    points: verifiedPts,
    maxPoints: weights.contractVerified,
    status: contractVerified ? "pass" : "neutral",
    detail: contractVerified ? "Verified" : "Not verified",
  });

  const mintPts = mintEnabled ? 0 : weights.mintDisabled;
  breakdown.push({
    factor: "mint",
    label: "Mint Authority",
    points: mintPts,
    maxPoints: weights.mintDisabled,
    status: mintEnabled ? "warn" : "pass",
    detail: mintEnabled ? "Mint enabled" : "Mint disabled",
  });

  const blacklistPts = blacklistEnabled ? 0 : weights.blacklistDisabled;
  breakdown.push({
    factor: "blacklist",
    label: "Blacklist Capability",
    points: blacklistPts,
    maxPoints: weights.blacklistDisabled,
    status: blacklistEnabled ? "warn" : "pass",
    detail: blacklistEnabled ? "Blacklist enabled" : "Blacklist disabled",
  });

  const tradingPts = tradingSwitch ? 0 : weights.tradingEnabled;
  breakdown.push({
    factor: "trading",
    label: "Trading Status",
    points: tradingPts,
    maxPoints: weights.tradingEnabled,
    status: tradingSwitch ? "warn" : "pass",
    detail: tradingSwitch ? "Trading switch (may be disabled)" : "Trading enabled",
  });

  const creatorPts = input.creatorVerified ? weights.creatorVerified : 0;
  breakdown.push({
    factor: "creator_verified",
    label: "Verified Creator",
    points: creatorPts,
    maxPoints: weights.creatorVerified,
    status: input.creatorVerified ? "pass" : "neutral",
    detail: input.creatorVerified ? "Creator verified" : "Unverified creator",
  });

  const rep = Math.max(0, input.creatorReputation ?? 0);
  const historyPts = Math.min(weights.creatorHistoryMax, Math.round((rep / 1000) * weights.creatorHistoryMax));
  breakdown.push({
    factor: "creator_history",
    label: "Creator History",
    points: historyPts,
    maxPoints: weights.creatorHistoryMax,
    status: historyPts >= weights.creatorHistoryMax / 2 ? "pass" : "neutral",
    detail: rep > 0 ? `Creator reputation: ${rep}` : "No creator history yet",
  });

  let score = breakdown.reduce((sum, item) => sum + item.points, 0);
  if (input.isScam) score = Math.min(score, 10);

  score = Math.max(0, Math.min(100, Math.round(score)));
  const riskLevel = getTrustRiskLevel(score);

  return {
    score,
    riskLevel,
    riskLabel: getTrustRiskLabel(riskLevel),
    breakdown,
  };
}
