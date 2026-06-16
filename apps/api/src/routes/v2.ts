import { Router } from "express";
import { getPublicV2FeatureFlags } from "@/lib/v2/feature-flags";
import { publicRateLimit } from "../middleware/rateLimit";

const router = Router();

router.use(publicRateLimit);

router.get("/feature-flags", (_req, res) => {
  res.json({ flags: getPublicV2FeatureFlags() });
});

export default router;
