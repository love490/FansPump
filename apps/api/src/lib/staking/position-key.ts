/** Stable grouping key — same key = one consolidated stake row in the UI and DB. */
export function stakingPositionGroupKey(position: {
  assetType: string;
  asset: string;
}): string {
  if (position.assetType === "OPN") return "opn";
  return `lp:${position.asset.toLowerCase()}`;
}

export function stakingPositionGroupWhere(
  wallet: string,
  assetType: "OPN" | "LP_TOKEN",
  asset: string
) {
  const normalizedAsset = assetType === "OPN" ? "opn" : asset.toLowerCase();
  return {
    wallet,
    isActive: true,
    assetType,
    asset: normalizedAsset,
  } as const;
}
