import { Router } from "express";
import { getPlatformSetting } from "@/lib/admin/platform-settings";
import { asyncHandler, setCacheControl } from "../lib/http-helpers";
import { publicRateLimit } from "../middleware/rateLimit";

const TRUST_PANEL_KEY = "trust_panel_config";

const DEFAULT = {
  showVerifiedCreator: true,
  showOwnershipRenounced: true,
  showLiquidityLocked: true,
  showMintable: true,
  showBurnable: true,
  showBlacklist: true,
  showPausable: true,
  showAntiBot: true,
};

const router = Router();

router.use(publicRateLimit);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    try {
      const config = await getPlatformSetting(TRUST_PANEL_KEY, DEFAULT);
      setCacheControl(res, "public, s-maxage=60, stale-while-revalidate=120");
      res.json({ config });
    } catch {
      res.json({ config: DEFAULT });
    }
  })
);

export default router;
