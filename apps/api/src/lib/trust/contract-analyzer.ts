import { TOKEN_FEATURES, hasFeature } from "@iopn/shared";
import type { TokenVerificationStatus } from "@iopn/database";
import type { ContractSignals } from "@/lib/trust/types";

export type ContractAnalyzerInput = {
  ownershipRenounced: boolean;
  featureFlags: bigint;
  verificationStatus: TokenVerificationStatus;
  isScam: boolean;
};

export async function analyzeContract(input: ContractAnalyzerInput): Promise<ContractSignals> {
  const flags = Number(input.featureFlags);
  const mintEnabled = hasFeature(flags, TOKEN_FEATURES.MINTABLE);
  const blacklistEnabled = hasFeature(flags, TOKEN_FEATURES.BLACKLIST);
  const tradingSwitch = hasFeature(flags, TOKEN_FEATURES.TRADING_SWITCH);
  const sourceVerified = input.verificationStatus === "APPROVED";

  let score = 0;
  if (input.ownershipRenounced) score += 30;
  if (!mintEnabled) score += 25;
  if (sourceVerified) score += 25;
  if (!blacklistEnabled && !tradingSwitch) score += 10;
  if (!input.isScam) score += 10;

  if (input.isScam) score = Math.min(score, 15);

  return {
    ownershipRenounced: input.ownershipRenounced,
    mintAuthorityRevoked: !mintEnabled,
    freezeAuthorityRevoked: !blacklistEnabled,
    isUpgradeable: false,
    hasAudit: false,
    sourceVerified,
    honeypotRisk: input.isScam,
    score: Math.min(100, score),
  };
}
