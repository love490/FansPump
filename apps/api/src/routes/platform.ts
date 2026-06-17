import { Router } from "express";
import { platformSettings, DEFAULT_SYSTEM, SETTING_KEYS, getPlatformSetting } from "@/lib/admin/platform-settings";
import prisma from "../lib/prisma";
import { asyncHandler, setCacheControl } from "../lib/http-helpers";
import { publicRateLimit } from "../middleware/rateLimit";

const router = Router();

router.use(publicRateLimit);

router.get(
  "/branding",
  asyncHandler(async (_req, res) => {
    try {
      const system = await getPlatformSetting(SETTING_KEYS.SYSTEM, DEFAULT_SYSTEM);
      setCacheControl(res, "public, s-maxage=120, stale-while-revalidate=300");
      res.json({
        logoUrl: system.logoUrl || DEFAULT_SYSTEM.logoUrl,
        logoBrandUrl: system.logoBrandUrl || DEFAULT_SYSTEM.logoBrandUrl,
        heroLogoUrl: system.heroLogoUrl || DEFAULT_SYSTEM.heroLogoUrl,
        faviconUrl: system.faviconUrl || DEFAULT_SYSTEM.faviconUrl,
        platformName: system.platformName,
      });
    } catch (e) {
      console.error("[GET /api/platform/branding]", e);
      res.json({
        logoUrl: DEFAULT_SYSTEM.logoUrl,
        logoBrandUrl: DEFAULT_SYSTEM.logoBrandUrl,
        heroLogoUrl: DEFAULT_SYSTEM.heroLogoUrl,
        faviconUrl: DEFAULT_SYSTEM.faviconUrl,
        platformName: DEFAULT_SYSTEM.platformName,
      });
    }
  })
);

router.get(
  "/creation-fees",
  asyncHandler(async (_req, res) => {
    try {
      const fees = await platformSettings.getCreationFees();
      setCacheControl(res, "public, s-maxage=60, stale-while-revalidate=120");
      res.json({ fees });
    } catch {
      res.status(500).json({ error: "Failed to load fees" });
    }
  })
);

router.get(
  "/promo",
  asyncHandler(async (_req, res) => {
    try {
      const system = await getPlatformSetting(SETTING_KEYS.SYSTEM, DEFAULT_SYSTEM);

      const announcements = await prisma.tokenAnnouncement.findMany({
        where: { isHidden: false },
        orderBy: { createdAt: "desc" },
        take: 12,
        include: {
          token: { select: { contractAddress: true, symbol: true, name: true } },
        },
      });

      setCacheControl(res, "public, s-maxage=30, stale-while-revalidate=60");
      res.json({
        banner: system.announcementBanner?.trim() ?? "",
        announcements: announcements.map((a) => ({
          id: a.id,
          title: a.title,
          tokenSymbol: a.token.symbol,
          tokenName: a.token.name,
          href: `/token/${a.token.contractAddress}`,
        })),
      });
    } catch (e) {
      console.error("[GET /api/platform/promo]", e);
      res.json({ banner: "", announcements: [] });
    }
  })
);

export default router;
