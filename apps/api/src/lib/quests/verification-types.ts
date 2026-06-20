export type OnchainRequirementType = "HOLD_TOKEN" | "ADD_LIQUIDITY" | "SWAP" | "STAKE";

export type VerificationConfig = {
  taskTypes?: string[];
  socialActions?: string[];
  requirementType?: OnchainRequirementType;
  /** ERC20 or native (use "native" for OPN) */
  tokenAddress?: string;
  /** Minimum balance in wei (string) */
  minAmount?: string;
  /** Liquidity pair quote side */
  pairId?: "OPN" | "WOPN" | "USDT";
  /** Minimum LP balance in wei */
  minLpAmount?: string;
  /** Optional tx hash for SWAP verification */
  txHash?: string;
};

export type ParticipationProof = {
  note?: string;
  proofUrl?: string;
  txHash?: string;
  screenshotUrl?: string;
};

export function parseVerificationConfig(raw: unknown): VerificationConfig | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as VerificationConfig;
}

export function parseParticipationProof(raw: unknown): ParticipationProof {
  if (!raw || typeof raw !== "object") return {};
  return raw as ParticipationProof;
}
