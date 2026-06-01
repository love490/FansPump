export const TOKEN_FEATURES = {
  MINTABLE: 1 << 0,
  BURNABLE: 1 << 1,
  PAUSABLE: 1 << 2,
  MAX_WALLET: 1 << 3,
  MAX_TX: 1 << 4,
  TRADING_SWITCH: 1 << 5,
  TAXABLE: 1 << 6,
  ANTI_BOT: 1 << 7,
  BLACKLIST: 1 << 8,
  WHITELIST: 1 << 9,
} as const;

export const FEATURE_LABELS: Record<keyof typeof TOKEN_FEATURES, string> = {
  MINTABLE: "Mintable",
  BURNABLE: "Burnable",
  PAUSABLE: "Pausable",
  MAX_WALLET: "Max Wallet",
  MAX_TX: "Max Transaction",
  TRADING_SWITCH: "Trading Enable Switch",
  TAXABLE: "Taxable",
  ANTI_BOT: "Anti-Bot Protection",
  BLACKLIST: "Blacklist",
  WHITELIST: "Whitelist",
};

export const FEATURE_DESCRIPTIONS: Record<keyof typeof TOKEN_FEATURES, string> = {
  MINTABLE:
    "Allows the owner to mint new tokens after deployment. Useful for emissions or treasury releases. Cannot be enabled later if omitted.",
  BURNABLE:
    "Holders and the owner can destroy tokens, reducing total supply. Helps with buybacks or supply management.",
  PAUSABLE:
    "Owner can pause all transfers in an emergency. Trading and wallets freeze until unpaused.",
  MAX_WALLET:
    "Caps how many tokens any single wallet can hold (excluding the owner). Helps limit whale concentration.",
  MAX_TX:
    "Limits the token amount per transfer (excluding the owner). Reduces large single-block dumps.",
  TRADING_SWITCH:
    "Trading starts disabled. Only the owner can move tokens until you explicitly enable trading for everyone.",
  TAXABLE:
    "Applies buy and sell taxes on transfers (max 5% each). Tax is split across your chosen wallets at deploy.",
  ANTI_BOT:
    "Creation guard for a set period: max buy as a % of total supply and max per-wallet accumulation. No wallet cooldown timers.",
  BLACKLIST:
    "Owner can block specific addresses from sending or receiving tokens. Use responsibly and transparently.",
  WHITELIST:
    "Only whitelisted addresses (plus owner) can transfer until you expand access. Often used for early distribution.",
};

/** Base fee to deploy any token (OPN). */
export const TOKEN_CREATION_BASE_FEE = 200;
/** @deprecated Use TOKEN_CREATION_BASE_FEE */
export const TOKEN_CREATION_FEE = TOKEN_CREATION_BASE_FEE;
export const TOKEN_CREATION_FEE_SYMBOL = "OPN";

/** Extra OPN fee per optional feature (only listed features add cost). */
export const FEATURE_EXTRA_FEES: Partial<Record<keyof typeof TOKEN_FEATURES, number>> = {
  MINTABLE: 50,
  TAXABLE: 40,
  ANTI_BOT: 100,
};

export function calculateCreationFeeOpn(selectedFeatures: number[]): number {
  let total = TOKEN_CREATION_BASE_FEE;
  for (const [key, bit] of Object.entries(TOKEN_FEATURES) as [keyof typeof TOKEN_FEATURES, number][]) {
    if (selectedFeatures.includes(bit) && FEATURE_EXTRA_FEES[key]) {
      total += FEATURE_EXTRA_FEES[key]!;
    }
  }
  return total;
}

export function getCreationFeeBreakdown(selectedFeatures: number[]) {
  const lines: { label: string; amount: number }[] = [
    { label: "Base creation fee", amount: TOKEN_CREATION_BASE_FEE },
  ];
  for (const [key, bit] of Object.entries(TOKEN_FEATURES) as [keyof typeof TOKEN_FEATURES, number][]) {
    const extra = FEATURE_EXTRA_FEES[key];
    if (extra && selectedFeatures.includes(bit)) {
      lines.push({ label: FEATURE_LABELS[key], amount: extra });
    }
  }
  return { lines, total: calculateCreationFeeOpn(selectedFeatures) };
}

export function getFeatureExtraFee(key: keyof typeof TOKEN_FEATURES): number {
  return FEATURE_EXTRA_FEES[key] ?? 0;
}

export const BUY_TAX_OPTIONS = [100, 200, 250, 300, 400, 500] as const;
export const SELL_TAX_OPTIONS = [100, 200, 250, 300, 400, 500] as const;
export const MAX_TAX_BPS = 500;

export const TAX_WALLETS = [
  "marketingWallet",
  "developmentWallet",
  "treasuryWallet",
  "communityWallet",
  "operationsWallet",
  "liquidityWallet",
] as const;

export const TAX_WALLET_LABELS: Record<(typeof TAX_WALLETS)[number], string> = {
  marketingWallet: "Marketing Wallet",
  developmentWallet: "Development Wallet",
  treasuryWallet: "Treasury Wallet",
  communityWallet: "Community Wallet",
  operationsWallet: "Operations Wallet",
  liquidityWallet: "Liquidity Wallet",
};

export function hasFeature(flags: bigint | number, feature: number): boolean {
  const f = typeof flags === "bigint" ? Number(flags) : flags;
  return (f & feature) !== 0;
}

export function encodeFeatureFlags(selected: number[]): number {
  return selected.reduce((acc, f) => acc | f, 0);
}

export function parseFeatureFlags(flags: bigint | number): string[] {
  const f = typeof flags === "bigint" ? Number(flags) : flags;
  return (Object.entries(TOKEN_FEATURES) as [keyof typeof TOKEN_FEATURES, number][])
    .filter(([, bit]) => (f & bit) !== 0)
    .map(([key]) => FEATURE_LABELS[key]);
}
