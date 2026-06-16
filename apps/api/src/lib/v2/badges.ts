export type SecurityBadgeId =
  | "liquidity_locked"
  | "ownership_renounced"
  | "contract_verified"
  | "trusted_project"
  | "early_builder"
  | "top_creator";

export type SecurityBadge = {
  id: SecurityBadgeId;
  emoji: string;
  label: string;
};

export const BADGE_CATALOG: Record<SecurityBadgeId, SecurityBadge> = {
  liquidity_locked: { id: "liquidity_locked", emoji: "🔒", label: "Liquidity Locked" },
  ownership_renounced: { id: "ownership_renounced", emoji: "🔥", label: "Ownership Renounced" },
  contract_verified: { id: "contract_verified", emoji: "✅", label: "Contract Verified" },
  trusted_project: { id: "trusted_project", emoji: "🟢", label: "Trusted Project" },
  early_builder: { id: "early_builder", emoji: "⭐", label: "Early Builder" },
  top_creator: { id: "top_creator", emoji: "🏆", label: "Top Creator" },
};

export type TokenBadgeInput = {
  liquidityLocked: boolean;
  liquidityBurned: boolean;
  ownershipRenounced: boolean;
  contractVerified: boolean;
  trustScore: number;
};

export type CreatorBadgeInput = {
  badges: string[];
  reputationScore: number;
  tokensCreated: number;
  joinedAt: Date;
  walletVerified: boolean;
  status?: string;
};

export function deriveTokenBadges(input: TokenBadgeInput): SecurityBadge[] {
  const ids: SecurityBadgeId[] = [];
  if (input.liquidityLocked || input.liquidityBurned) ids.push("liquidity_locked");
  if (input.ownershipRenounced) ids.push("ownership_renounced");
  if (input.contractVerified) ids.push("contract_verified");
  if (input.trustScore >= 70 && input.contractVerified) ids.push("trusted_project");
  return ids.map((id) => BADGE_CATALOG[id]);
}

export function deriveCreatorBadges(input: CreatorBadgeInput): SecurityBadge[] {
  const ids = new Set<SecurityBadgeId>(
    (input.badges ?? []).filter((b): b is SecurityBadgeId => b in BADGE_CATALOG)
  );

  if (input.reputationScore >= 500) ids.add("top_creator");
  const daysSinceJoin = (Date.now() - input.joinedAt.getTime()) / (1000 * 60 * 60 * 24);
  if (input.tokensCreated >= 1 && daysSinceJoin <= 90) ids.add("early_builder");
  if (input.walletVerified || input.status === "VERIFIED" || input.status === "TRUSTED") {
    ids.add("contract_verified");
  }

  return [...ids].map((id) => BADGE_CATALOG[id]);
}
