import { prisma } from "@iopn/database";

export const SETTING_KEYS = {
  SYSTEM: "system",
  DISCOVERY: "discovery",
  CREATION_FEES: "creation_fees",
  TRADING_FEES: "trading_fees",
  POOL_SHARE: "pool_share",
  TREASURY: "treasury",
  BRIDGE: "bridge",
  SECURITY: "security",
  PROMO_CARDS: "promo_cards",
} as const;

export type SystemConfig = {
  platformName: string;
  platformDescription: string;
  announcementBanner: string;
  maintenanceMode: boolean;
  supportEmail: string;
  supportUrl: string;
  socialLinks: {
    twitter?: string;
    telegram?: string;
    discord?: string;
  };
  /** Public site branding — editable in admin System settings */
  logoUrl: string;
  logoBrandUrl: string;
  heroLogoUrl: string;
  faviconUrl: string;
  /** Primary brand color as #RRGGBB — applied site-wide via CSS variables */
  brandColor: string;
};

export type DiscoveryConfig = {
  volumeWeight: number;
  txCountWeight: number;
  activityWeight: number;
  trendingWeight: number;
};

export type CreationFeesConfig = Record<string, number>;
export type TradingFeesConfig = {
  totalTradingFeeBps: number;
  creatorShareBps: number;
  treasuryShareBps: number;
  poolShareBps: number;
};
export type PoolShareConfig = {
  poolSharePercentage: number;
  poolReserveTarget: string;
  liquidityIncentiveEnabled: boolean;
  trackingOnly: boolean;
};
export type TreasuryConfig = {
  treasuryWallet: string;
  revenueWallet: string;
  emergencyWallet: string;
  walletType: "EOA" | "SAFE_MULTISIG";
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

export type ExplorePromoCardEntry = {
  id: string;
  enabled: boolean;
  label: string;
  headline: string;
  subtitle: string;
  href: string;
  sortOrder: number;
  bountyId?: string | null;
};

export type PromoCardsConfig = {
  cards: ExplorePromoCardEntry[];
};

export const DEFAULT_PROMO_CARDS: PromoCardsConfig = { cards: [] };

export const DEFAULT_SYSTEM: SystemConfig = {
  platformName: "FansPump",
  platformDescription: "Launch and trade tokens on OPN Network",
  announcementBanner: "",
  maintenanceMode: false,
  supportEmail: "",
  supportUrl: "",
  socialLinks: {},
  logoUrl: "/images/logo.png",
  logoBrandUrl: "/images/logo-brand.png",
  heroLogoUrl: "/images/hero-logo.png",
  faviconUrl: "/images/logo.png",
  brandColor: "#2563eb",
};

export const DEFAULT_SECURITY: SecurityConfig = {
  tokenCreationPaused: false,
  tradingPaused: false,
  claimsPaused: false,
};

const DEFAULT_DISCOVERY: DiscoveryConfig = {
  volumeWeight: 25,
  txCountWeight: 25,
  activityWeight: 25,
  trendingWeight: 25,
};

const DEFAULT_CREATION_FEES: CreationFeesConfig = {
  baseFee: 0,
  burnable: 0,
  mintable: 0,
  pausable: 0,
  blacklist: 0,
  antiBot: 0,
  taxModule: 0,
  ownershipRenounce: 0,
  liquidityLock: 0,
  verification: 0,
};

const DEFAULT_TRADING_FEES: TradingFeesConfig = {
  totalTradingFeeBps: 300,
  creatorShareBps: 100,
  treasuryShareBps: 100,
  poolShareBps: 100,
};

const DEFAULT_POOL_SHARE: PoolShareConfig = {
  poolSharePercentage: 0,
  poolReserveTarget: "0",
  liquidityIncentiveEnabled: false,
  trackingOnly: true,
};

const DEFAULT_TREASURY: TreasuryConfig = {
  treasuryWallet: "",
  revenueWallet: "",
  emergencyWallet: "",
  walletType: "EOA",
};

const DEFAULT_BRIDGE: BridgeConfig = {
  bridgeFeeBps: 0,
  supportedChains: [],
  bridgeTreasuryWallet: "",
  enabled: false,
};

export async function getPlatformSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.platformSetting.findUnique({ where: { key } });
  if (!row?.value) return fallback;
  return { ...fallback, ...(row.value as T) };
}

export async function setPlatformSetting<T extends object>(key: string, value: T, updatedBy?: string) {
  await prisma.platformSetting.upsert({
    where: { key },
    create: { key, value, updatedBy },
    update: { value, updatedBy },
  });
}

export const platformSettings = {
  getSystem: () => getPlatformSetting(SETTING_KEYS.SYSTEM, DEFAULT_SYSTEM),
  setSystem: (value: SystemConfig, updatedBy?: string) =>
    setPlatformSetting(SETTING_KEYS.SYSTEM, value, updatedBy),
  getDiscovery: () => getPlatformSetting(SETTING_KEYS.DISCOVERY, DEFAULT_DISCOVERY),
  setDiscovery: (value: DiscoveryConfig, updatedBy?: string) =>
    setPlatformSetting(SETTING_KEYS.DISCOVERY, value, updatedBy),
  getCreationFees: () => getPlatformSetting(SETTING_KEYS.CREATION_FEES, DEFAULT_CREATION_FEES),
  setCreationFees: (value: CreationFeesConfig, updatedBy?: string) =>
    setPlatformSetting(SETTING_KEYS.CREATION_FEES, value, updatedBy),
  getTradingFees: () => getPlatformSetting(SETTING_KEYS.TRADING_FEES, DEFAULT_TRADING_FEES),
  setTradingFees: (value: TradingFeesConfig, updatedBy?: string) =>
    setPlatformSetting(SETTING_KEYS.TRADING_FEES, value, updatedBy),
  getPoolShare: () => getPlatformSetting(SETTING_KEYS.POOL_SHARE, DEFAULT_POOL_SHARE),
  setPoolShare: (value: PoolShareConfig, updatedBy?: string) =>
    setPlatformSetting(SETTING_KEYS.POOL_SHARE, value, updatedBy),
  getTreasury: () => getPlatformSetting(SETTING_KEYS.TREASURY, DEFAULT_TREASURY),
  setTreasury: (value: TreasuryConfig, updatedBy?: string) =>
    setPlatformSetting(SETTING_KEYS.TREASURY, value, updatedBy),
  getBridge: () => getPlatformSetting(SETTING_KEYS.BRIDGE, DEFAULT_BRIDGE),
  setBridge: (value: BridgeConfig, updatedBy?: string) =>
    setPlatformSetting(SETTING_KEYS.BRIDGE, value, updatedBy),
  getSecurity: () => getPlatformSetting(SETTING_KEYS.SECURITY, DEFAULT_SECURITY),
  setSecurity: (value: SecurityConfig, updatedBy?: string) =>
    setPlatformSetting(SETTING_KEYS.SECURITY, value, updatedBy),
  getPromoCards: () => getPlatformSetting(SETTING_KEYS.PROMO_CARDS, DEFAULT_PROMO_CARDS),
  setPromoCards: (value: PromoCardsConfig, updatedBy?: string) =>
    setPlatformSetting(SETTING_KEYS.PROMO_CARDS, value, updatedBy),
};
