export const TOKEN_CATEGORIES = [
  "MEME",
  "GAMING",
  "AI",
  "DEFI",
  "INFRASTRUCTURE",
  "NFT",
  "COMMUNITY",
  "UTILITY",
  "OTHER",
] as const;

export type TokenCategoryId = (typeof TOKEN_CATEGORIES)[number];

export const TOKEN_CATEGORY_LABELS: Record<TokenCategoryId, string> = {
  MEME: "Meme",
  GAMING: "Gaming",
  AI: "AI",
  DEFI: "DeFi",
  INFRASTRUCTURE: "Infrastructure",
  NFT: "NFT",
  COMMUNITY: "Community",
  UTILITY: "Utility",
  OTHER: "Other",
};

export function isTokenCategory(value: string): value is TokenCategoryId {
  return (TOKEN_CATEGORIES as readonly string[]).includes(value);
}
