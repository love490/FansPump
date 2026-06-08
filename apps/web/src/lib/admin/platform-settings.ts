import { prisma } from "@iopn/database";
import {
  FEATURE_EXTRA_FEES,
  TOKEN_CREATION_BASE_FEE,
  TOKEN_FEATURES,
} from "@iopn/shared";
import { FEE_SPLIT } from "@/lib/analytics/fee-split";

export const SETTING_KEYS = {
  CREATION_FEES: "creation_fees",
  TRADING_FEES: "trading_fees",
  TREASURY: "treasury",
  DISCOVERY: "discovery",
  POOL_SHARE: "pool_share",
  BRIDGE: "bridge",
  SECURITY: "security",
  SYSTEM: "system",
} as const;

export type CreationFeesConfig = {
  baseFee: number;
  burnable: number;
  mintable: number;
  pausable: number;
  blacklist: number;
  antiBot: number;
  taxModule: number;
  ownershipRenounce: number;
  liquidityLock: number;
  verification: number;
};

export type TradingFeesConfig = {
  totalTradingFeeBps: number;
  creatorShareBps: number;
  treasuryShareBps: number;
  poolShareBps: number;
};

export type TreasuryConfig = {
  treasuryWallet: string;
  revenueWallet: string;
  emergencyWallet: string;
  walletType: "EOA" | "SAFE_MULTISIG";
};

export type DiscoveryConfig = {
  volumeWeight: number;
  txCountWeight: number;
  activityWeight: number;
  trendingWeight: number;
};

export type PoolShareConfig = {
  poolSharePercentage: number;
  poolReserveTarget: string;
  liquidityIncentiveEnabled: boolean;
  trackingOnly: boolean;
};

export type BridgeConfig = {
  bridgeFeeBps: number;
  supportedChains: string[];
  bridgeTreasuryWallet: string;
  enabled: boolean;
};

export type SecurityConfig = {
  tokenCreationPaused: boolean;
  tradingPaused: boolean;
  claimsPaused: boolean;
};

export type SystemConfig = {
  platformName: string;
  platformDescription: string;
  announcementBanner: string;
  maintenanceMode: boolean;
  supportEmail: string;
  supportUrl: string;
  socialLinks: { twitter?: string; telegram?: string; discord?: string };
};

export const DEFAULT_CREATION_FEES: CreationFeesConfig = {
  baseFee: TOKEN_CREATION_BASE_FEE,
  burnable: FEATURE_EXTRA_FEES.BURNABLE ?? 0.2,
  mintable: FEATURE_EXTRA_FEES.MINTABLE ?? 0.2,
  pausable: FEATURE_EXTRA_FEES.PAUSABLE ?? 0.2,
  blacklist: FEATURE_EXTRA_FEES.BLACKLIST ?? 0.2,
  antiBot: FEATURE_EXTRA_FEES.ANTI_BOT ?? 0.5,
  taxModule: FEATURE_EXTRA_FEES.TAXABLE ?? 1,
  ownershipRenounce: 0,
  liquidityLock: 0,
  verification: 0,
};

export const DEFAULT_TRADING_FEES: TradingFeesConfig = {
  totalTradingFeeBps: 300,
  creatorShareBps: FEE_SPLIT.creatorBps,
  treasuryShareBps: FEE_SPLIT.treasuryBps,
  poolShareBps: FEE_SPLIT.poolBps,
};

export const DEFAULT_TREASURY: TreasuryConfig = {
  treasuryWallet: "",
  revenueWallet: "",
  emergencyWallet: "",
  walletType: "EOA",
};

export const DEFAULT_DISCOVERY: DiscoveryConfig = {
  volumeWeight: 40,
  txCountWeight: 30,
  activityWeight: 20,
  trendingWeight: 10,
};

export const DEFAULT_POOL_SHARE: PoolShareConfig = {
  poolSharePercentage: 20,
  poolReserveTarget: "0",
  liquidityIncentiveEnabled: false,
  trackingOnly: true,
};

export const DEFAULT_BRIDGE: BridgeConfig = {
  bridgeFeeBps: 0,
  supportedChains: [],
  bridgeTreasuryWallet: "",
  enabled: false,
};

export const DEFAULT_SECURITY: SecurityConfig = {
  tokenCreationPaused: false,
  tradingPaused: false,
  claimsPaused: false,
};

export const DEFAULT_SYSTEM: SystemConfig = {
  platformName: "FansPump",
  platformDescription: "Create tokens, grow your community, and swap on OPNChain",
  announcementBanner: "",
  maintenanceMode: false,
  supportEmail: "",
  supportUrl: "",
  socialLinks: {},
};

async function getSetting<T>(key: string, defaults: T): Promise<T> {
  const row = await prisma.platformSetting.findUnique({ where: { key } });
  if (!row?.value || typeof row.value !== "object") return defaults;
  return { ...defaults, ...(row.value as object) } as T;
}

async function setSetting<T extends object>(key: string, value: T, updatedBy?: string) {
  await prisma.platformSetting.upsert({
    where: { key },
    create: { key, value, updatedBy },
    update: { value, updatedBy },
  });
}

export const platformSettings = {
  getCreationFees: () => getSetting(SETTING_KEYS.CREATION_FEES, DEFAULT_CREATION_FEES),
  setCreationFees: (v: CreationFeesConfig, by?: string) =>
    setSetting(SETTING_KEYS.CREATION_FEES, v, by),

  getTradingFees: () => getSetting(SETTING_KEYS.TRADING_FEES, DEFAULT_TRADING_FEES),
  setTradingFees: (v: TradingFeesConfig, by?: string) =>
    setSetting(SETTING_KEYS.TRADING_FEES, v, by),

  getTreasury: () => getSetting(SETTING_KEYS.TREASURY, DEFAULT_TREASURY),
  setTreasury: (v: TreasuryConfig, by?: string) => setSetting(SETTING_KEYS.TREASURY, v, by),

  getDiscovery: () => getSetting(SETTING_KEYS.DISCOVERY, DEFAULT_DISCOVERY),
  setDiscovery: (v: DiscoveryConfig, by?: string) => setSetting(SETTING_KEYS.DISCOVERY, v, by),

  getPoolShare: () => getSetting(SETTING_KEYS.POOL_SHARE, DEFAULT_POOL_SHARE),
  setPoolShare: (v: PoolShareConfig, by?: string) => setSetting(SETTING_KEYS.POOL_SHARE, v, by),

  getBridge: () => getSetting(SETTING_KEYS.BRIDGE, DEFAULT_BRIDGE),
  setBridge: (v: BridgeConfig, by?: string) => setSetting(SETTING_KEYS.BRIDGE, v, by),

  getSecurity: () => getSetting(SETTING_KEYS.SECURITY, DEFAULT_SECURITY),
  setSecurity: (v: SecurityConfig, by?: string) => setSetting(SETTING_KEYS.SECURITY, v, by),

  getSystem: () => getSetting(SETTING_KEYS.SYSTEM, DEFAULT_SYSTEM),
  setSystem: (v: SystemConfig, by?: string) => setSetting(SETTING_KEYS.SYSTEM, v, by),
};

/** Map feature bits to admin-configured creation fee keys. */
export function featureBitToFeeKey(bit: number): keyof CreationFeesConfig | null {
  const map: Record<number, keyof CreationFeesConfig> = {
    [TOKEN_FEATURES.BURNABLE]: "burnable",
    [TOKEN_FEATURES.MINTABLE]: "mintable",
    [TOKEN_FEATURES.PAUSABLE]: "pausable",
    [TOKEN_FEATURES.BLACKLIST]: "blacklist",
    [TOKEN_FEATURES.ANTI_BOT]: "antiBot",
    [TOKEN_FEATURES.TAXABLE]: "taxModule",
  };
  return map[bit] ?? null;
}
