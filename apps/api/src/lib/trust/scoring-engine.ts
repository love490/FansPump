import type { TrustScoreResult, TrustTier } from "@/lib/trust/types";
import { analyzeContract, type ContractAnalyzerInput } from "./contract-analyzer";
import { analyzeLiquidity } from "./liquidity-analyzer";
import { analyzeMarket } from "./market-analyzer";
import { analyzeCreator } from "./creator-analyzer";

const WEIGHTS = {
  contractSafety: 0.35,
  liquiditySafety: 0.25,
  marketIntegrity: 0.25,
  creatorReputation: 0.15,
} as const;

function getTier(score: number): TrustTier {
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

export type ScoringTokenInput = ContractAnalyzerInput & {
  tokenAddress: string;
  tokenId: string;
  creatorAddress: string;
  poolStrength: number;
  holderCount: number;
  volume24h: number;
  txCount24h: number;
  hasLpBurn: boolean;
};

export async function calculateTrustScore(input: ScoringTokenInput): Promise<TrustScoreResult> {
  const [contractSignals, liquiditySignals, marketSignals, creatorSignals] = await Promise.all([
    analyzeContract(input),
    analyzeLiquidity(input.tokenId, input.poolStrength, input.hasLpBurn),
    analyzeMarket(input.tokenId, input.holderCount, input.volume24h, input.txCount24h),
    analyzeCreator(input.creatorAddress),
  ]);

  const raw =
    contractSignals.score * WEIGHTS.contractSafety +
    liquiditySignals.score * WEIGHTS.liquiditySafety +
    marketSignals.score * WEIGHTS.marketIntegrity +
    creatorSignals.score * WEIGHTS.creatorReputation;

  const score = Math.round(Math.min(100, Math.max(0, raw)));

  return {
    tokenAddress: input.tokenAddress,
    score,
    tier: getTier(score),
    contractSafety: Math.round(contractSignals.score),
    liquiditySafety: Math.round(liquiditySignals.score),
    marketIntegrity: Math.round(marketSignals.score),
    creatorReputation: Math.round(creatorSignals.score),
    signals: {
      contract: contractSignals,
      liquidity: liquiditySignals,
      market: marketSignals,
      creator: creatorSignals,
    },
    calculatedAt: new Date().toISOString(),
  };
}
