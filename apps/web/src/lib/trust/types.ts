export type TrustTier = "LOW" | "MEDIUM" | "HIGH";

export interface ContractSignals {
  ownershipRenounced: boolean;
  mintAuthorityRevoked: boolean;
  freezeAuthorityRevoked: boolean;
  isUpgradeable: boolean;
  hasAudit: boolean;
  sourceVerified: boolean;
  honeypotRisk: boolean;
  score: number;
}

export interface LiquiditySignals {
  liquidityLocked: boolean;
  lockDurationDays: number;
  liquidityDepthUSD: number;
  removalEventsLast30d: number;
  lpConcentration: number;
  score: number;
}

export interface MarketSignals {
  top10HolderPercent: number;
  snipersDetected: number;
  washTradingScore: number;
  priceManipulationFlags: number;
  uniqueBuyersLast24h: number;
  score: number;
}

export interface CreatorSignals {
  priorTokenCount: number;
  priorRugCount: number;
  avgTokenSurvival30d: number;
  questCompletionRate: number;
  score: number;
}

export interface TrustScoreResult {
  tokenAddress: string;
  score: number;
  tier: TrustTier;
  contractSafety: number;
  liquiditySafety: number;
  marketIntegrity: number;
  creatorReputation: number;
  signals: {
    contract: ContractSignals;
    liquidity: LiquiditySignals;
    market: MarketSignals;
    creator: CreatorSignals;
  };
  calculatedAt: string;
}

export type TrustComponentKey =
  | "contractSafety"
  | "liquiditySafety"
  | "marketIntegrity"
  | "creatorReputation";

export const TRUST_COMPONENT_WEIGHTS: Record<TrustComponentKey, number> = {
  contractSafety: 0.35,
  liquiditySafety: 0.25,
  marketIntegrity: 0.25,
  creatorReputation: 0.15,
};

export const TRUST_COMPONENT_LABELS: Record<TrustComponentKey, string> = {
  contractSafety: "Contract Safety",
  liquiditySafety: "Liquidity Safety",
  marketIntegrity: "Market Integrity",
  creatorReputation: "Creator Reputation",
};

export function tierLabel(tier: TrustTier): string {
  switch (tier) {
    case "HIGH":
      return "Trusted";
    case "MEDIUM":
      return "Caution";
    case "LOW":
      return "High Risk";
  }
}

export function tierRiskLevel(tier: TrustTier, score: number): string {
  if (tier === "HIGH" && score >= 85) return "excellent";
  if (tier === "HIGH") return "good";
  if (tier === "MEDIUM") return "moderate";
  return "high";
}
