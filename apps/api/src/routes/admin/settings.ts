import { Router } from "express";
import { z } from "zod";
import {
  DEFAULT_STAKING_PLATFORM_CONFIG,
  type StakingPlatformConfig,
} from "@iopn/shared";
import { AdminAuthError } from "@/lib/admin-auth";
import {
  platformSettings,
  getPlatformSetting,
  setPlatformSetting,
  type SystemConfig,
  type DiscoveryConfig,
  type CreationFeesConfig,
  type TradingFeesConfig,
  type PoolShareConfig,
  type TreasuryConfig,
  type BridgeConfig,
  type SecurityConfig,
} from "@/lib/admin/platform-settings";
import { STAKING_CONFIG_KEY } from "@/lib/staking/config";
import { getPublicV2FeatureFlags } from "@/lib/v2/feature-flags";
import { asyncHandler } from "../../lib/http-helpers";
import { requirePermission } from "../../lib/admin/express-api-auth";
import { logAdminAction } from "../../lib/admin/express-audit";
import { handleAdminError } from "../../lib/admin/handle-error";

const router = Router();

const systemSchema = z.object({
  system: z.object({
    platformName: z.string().min(1),
    platformDescription: z.string(),
    announcementBanner: z.string(),
    maintenanceMode: z.boolean(),
    supportEmail: z.string(),
    supportUrl: z.string(),
    socialLinks: z.object({
      twitter: z.string().optional(),
      telegram: z.string().optional(),
      discord: z.string().optional(),
    }),
  }),
});

const tierSchema = z.object({
  tier: z.enum(["BRONZE", "SILVER", "GOLD", "PLATINUM"]),
  minStakeOpn: z.string(),
  creationFeeDiscountBps: z.number().int().min(0).max(10000),
  visibilityBoost: z.number().min(0),
  rewardEligible: z.boolean(),
});

const lpPoolSchema = z.object({
  id: z.string(),
  label: z.string(),
  token0: z.string(),
  token1: z.string(),
  poolAddress: z.string().optional(),
  enabled: z.boolean(),
});

const stakingConfigSchema = z.object({
  tiers: z.array(tierSchema),
  visibilityBoostEnabled: z.boolean().optional(),
  discoveryRankingBoostEnabled: z.boolean().optional(),
  opnStakingEnabled: z.boolean().optional(),
  lpStakingEnabled: z.boolean().optional(),
  supportedLpPools: z.array(lpPoolSchema).optional(),
});

const discoverySchema = z.object({
  discovery: z.object({
    volumeWeight: z.number().min(0).max(100),
    txCountWeight: z.number().min(0).max(100),
    activityWeight: z.number().min(0).max(100),
    trendingWeight: z.number().min(0).max(100),
  }),
});

const creationFeesSchema = z.object({
  fees: z.object({
    baseFee: z.number().min(0),
    burnable: z.number().min(0),
    mintable: z.number().min(0),
    pausable: z.number().min(0),
    blacklist: z.number().min(0),
    antiBot: z.number().min(0),
    taxModule: z.number().min(0),
    ownershipRenounce: z.number().min(0),
    liquidityLock: z.number().min(0),
    verification: z.number().min(0),
  }),
});

const tradingFeesSchema = z.object({
  fees: z.object({
    totalTradingFeeBps: z.number().min(0).max(10_000),
    creatorShareBps: z.number().min(0).max(10_000),
    treasuryShareBps: z.number().min(0).max(10_000),
    poolShareBps: z.number().min(0).max(10_000),
  }),
});

const poolShareSchema = z.object({
  poolShare: z.object({
    poolSharePercentage: z.number().min(0).max(100),
    poolReserveTarget: z.string(),
    liquidityIncentiveEnabled: z.boolean(),
    trackingOnly: z.boolean(),
  }),
});

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/i).or(z.literal(""));

const treasurySchema = z.object({
  treasury: z.object({
    treasuryWallet: addressSchema,
    revenueWallet: addressSchema,
    emergencyWallet: addressSchema,
    walletType: z.enum(["EOA", "SAFE_MULTISIG"]),
  }),
});

const bridgeSchema = z.object({
  bridge: z.object({
    bridgeFeeBps: z.number().min(0).max(10_000),
    supportedChains: z.array(z.string()),
    bridgeTreasuryWallet: z.string(),
    enabled: z.boolean(),
  }),
});

const securitySchema = z.object({
  security: z.object({
    tokenCreationPaused: z.boolean(),
    tradingPaused: z.boolean(),
    claimsPaused: z.boolean(),
  }),
});

type V2FeatureFlagOverrides = {
  trustScore?: boolean;
  creatorProfiles?: boolean;
  creatorQuests?: boolean;
  reputationSystem?: boolean;
  leaderboards?: boolean;
};

router.get(
  "/system",
  asyncHandler(async (req, res) => {
    try {
      await requirePermission(req, "system", "GET");
      const system = await platformSettings.getSystem();
      res.json({ system });
    } catch (e) {
      handleAdminError(res, e, "Failed to load system settings");
    }
  })
);

router.patch(
  "/system",
  asyncHandler(async (req, res) => {
    try {
      const { email, admin, parsedBody } = await requirePermission(req, "system", "PATCH");
      const { system } = systemSchema.parse(parsedBody);
      await platformSettings.setSystem(system as SystemConfig, email);
      await logAdminAction(email, "SETTINGS_UPDATE", { section: "system", system }, req, admin.id);
      res.json({ ok: true, system });
    } catch (e) {
      handleAdminError(res, e, "Update failed");
    }
  })
);

router.get(
  "/staking",
  asyncHandler(async (req, res) => {
    try {
      await requirePermission(req, "staking", "GET");
      const config = await getPlatformSetting(STAKING_CONFIG_KEY, DEFAULT_STAKING_PLATFORM_CONFIG);
      res.json({ config });
    } catch (e) {
      handleAdminError(res, e, "Failed to load staking config");
    }
  })
);

router.patch(
  "/staking",
  asyncHandler(async (req, res) => {
    try {
      const { parsedBody } = await requirePermission(req, "staking", "PATCH");
      const config = stakingConfigSchema.parse(parsedBody.config) as StakingPlatformConfig;
      await setPlatformSetting(STAKING_CONFIG_KEY, config);
      res.json({ config });
    } catch (e) {
      handleAdminError(res, e, "Failed to save staking config");
    }
  })
);

router.get(
  "/discovery",
  asyncHandler(async (req, res) => {
    try {
      await requirePermission(req, "discovery", "GET");
      const discovery = await platformSettings.getDiscovery();
      res.json({ discovery });
    } catch (e) {
      handleAdminError(res, e, "Failed to load discovery settings");
    }
  })
);

router.patch(
  "/discovery",
  asyncHandler(async (req, res) => {
    try {
      const { email, admin, parsedBody } = await requirePermission(req, "discovery", "PATCH");
      const { discovery } = discoverySchema.parse(parsedBody);
      await platformSettings.setDiscovery(discovery as DiscoveryConfig, email);
      await logAdminAction(
        email,
        "SETTINGS_UPDATE",
        { section: "discovery", discovery },
        req,
        admin.id
      );
      res.json({ ok: true, discovery });
    } catch (e) {
      handleAdminError(res, e, "Update failed");
    }
  })
);

router.get(
  "/creation-fees",
  asyncHandler(async (req, res) => {
    try {
      await requirePermission(req, "creation_fees", "GET");
      const fees = await platformSettings.getCreationFees();
      res.json({ fees });
    } catch (e) {
      handleAdminError(res, e, "Failed to load fees");
    }
  })
);

router.patch(
  "/creation-fees",
  asyncHandler(async (req, res) => {
    try {
      const { email, admin, parsedBody } = await requirePermission(req, "creation_fees", "PATCH");
      const { fees } = creationFeesSchema.parse(parsedBody);
      await platformSettings.setCreationFees(fees as CreationFeesConfig, email);
      await logAdminAction(email, "FEE_CHANGE", { section: "creation_fees", fees }, req, admin.id);
      res.json({ ok: true, fees });
    } catch (e) {
      handleAdminError(res, e, "Update failed");
    }
  })
);

router.get(
  "/trading-fees",
  asyncHandler(async (req, res) => {
    try {
      await requirePermission(req, "trading_fees", "GET");
      const fees = await platformSettings.getTradingFees();
      res.json({ fees });
    } catch (e) {
      handleAdminError(res, e, "Failed to load fees");
    }
  })
);

router.patch(
  "/trading-fees",
  asyncHandler(async (req, res) => {
    try {
      const { email, admin, parsedBody } = await requirePermission(req, "trading_fees", "PATCH");
      const { fees } = tradingFeesSchema.parse(parsedBody);
      const sum = fees.creatorShareBps + fees.treasuryShareBps + fees.poolShareBps;
      if (sum !== 10_000) {
        res.status(400).json({
          error: "Creator + Treasury + Pool must equal 100% (10000 bps)",
        });
        return;
      }
      await platformSettings.setTradingFees(fees as TradingFeesConfig, email);
      await logAdminAction(email, "FEE_CHANGE", { section: "trading_fees", fees }, req, admin.id);
      res.json({ ok: true, fees });
    } catch (e) {
      handleAdminError(res, e, "Update failed");
    }
  })
);

router.get(
  "/pool-share",
  asyncHandler(async (req, res) => {
    try {
      await requirePermission(req, "pool_share", "GET");
      const poolShare = await platformSettings.getPoolShare();
      res.json({ poolShare });
    } catch (e) {
      handleAdminError(res, e, "Failed to load pool share");
    }
  })
);

router.patch(
  "/pool-share",
  asyncHandler(async (req, res) => {
    try {
      const { email, admin, parsedBody } = await requirePermission(req, "pool_share", "PATCH");
      const { poolShare } = poolShareSchema.parse(parsedBody);
      await platformSettings.setPoolShare(poolShare as PoolShareConfig, email);
      await logAdminAction(
        email,
        "SETTINGS_UPDATE",
        { section: "pool_share", poolShare },
        req,
        admin.id
      );
      res.json({ ok: true, poolShare });
    } catch (e) {
      handleAdminError(res, e, "Update failed");
    }
  })
);

router.get(
  "/treasury",
  asyncHandler(async (req, res) => {
    try {
      await requirePermission(req, "treasury", "GET");
      const treasury = await platformSettings.getTreasury();
      res.json({ treasury });
    } catch (e) {
      handleAdminError(res, e, "Failed to load treasury");
    }
  })
);

router.patch(
  "/treasury",
  asyncHandler(async (req, res) => {
    try {
      const { email, admin, parsedBody } = await requirePermission(req, "treasury", "PATCH");
      const { treasury } = treasurySchema.parse(parsedBody);
      await platformSettings.setTreasury(treasury as TreasuryConfig, email);
      await logAdminAction(email, "WALLET_CHANGE", { section: "treasury", treasury }, req, admin.id);
      res.json({ ok: true, treasury });
    } catch (e) {
      handleAdminError(res, e, "Update failed");
    }
  })
);

router.get(
  "/bridge",
  asyncHandler(async (req, res) => {
    try {
      await requirePermission(req, "bridge", "GET");
      const bridge = await platformSettings.getBridge();
      res.json({ bridge });
    } catch (e) {
      handleAdminError(res, e, "Failed to load bridge settings");
    }
  })
);

router.patch(
  "/bridge",
  asyncHandler(async (req, res) => {
    try {
      const { email, admin, parsedBody } = await requirePermission(req, "bridge", "PATCH");
      const { bridge } = bridgeSchema.parse(parsedBody);
      await platformSettings.setBridge(bridge as BridgeConfig, email);
      await logAdminAction(email, "SETTINGS_UPDATE", { section: "bridge", bridge }, req, admin.id);
      res.json({ ok: true, bridge });
    } catch (e) {
      handleAdminError(res, e, "Update failed");
    }
  })
);

router.get(
  "/security",
  asyncHandler(async (req, res) => {
    try {
      await requirePermission(req, "security", "GET");
      const security = await platformSettings.getSecurity();
      res.json({ security });
    } catch (e) {
      handleAdminError(res, e, "Failed to load security settings");
    }
  })
);

router.patch(
  "/security",
  asyncHandler(async (req, res) => {
    try {
      const { email, admin, parsedBody } = await requirePermission(req, "security", "PATCH");
      const { security } = securitySchema.parse(parsedBody);
      await platformSettings.setSecurity(security as SecurityConfig, email);
      await logAdminAction(email, "PAUSE_ACTION", { section: "security", security }, req, admin.id);
      res.json({ ok: true, security });
    } catch (e) {
      handleAdminError(res, e, "Update failed");
    }
  })
);

router.get(
  "/v2/feature-flags",
  asyncHandler(async (req, res) => {
    try {
      await requirePermission(req, "v2_platform", "GET");
      const envDefaults = getPublicV2FeatureFlags();
      const overrides = await getPlatformSetting<V2FeatureFlagOverrides>("v2_feature_flags", {});

      res.json({
        envDefaults,
        overrides,
        effective: { ...envDefaults, ...overrides },
      });
    } catch (e) {
      if (e instanceof AdminAuthError) {
        res.status(401).json({ error: e.message });
        return;
      }
      throw e;
    }
  })
);

router.patch(
  "/v2/feature-flags",
  asyncHandler(async (req, res) => {
    try {
      const { parsedBody, email } = await requirePermission(req, "v2_platform", "PATCH");
      const overrides = (parsedBody.overrides ?? {}) as V2FeatureFlagOverrides;
      await setPlatformSetting("v2_feature_flags", overrides, email);

      const envDefaults = getPublicV2FeatureFlags();
      res.json({ effective: { ...envDefaults, ...overrides } });
    } catch (e) {
      if (e instanceof AdminAuthError) {
        res.status(401).json({ error: e.message });
        return;
      }
      throw e;
    }
  })
);

export default router;
