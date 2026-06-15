import { Router } from "express";
import { notImplemented, ok } from "../lib/route-utils";
import { optionalAuthMiddleware } from "../middleware/auth";
import { publicRateLimit } from "../middleware/rateLimit";

const router = Router();

router.use(publicRateLimit);
router.use(optionalAuthMiddleware);

router.get("/", (req, res) => ok(req, res, "staking"));
router.get("/config", notImplemented);
router.get("/stats", notImplemented);
router.post("/", notImplemented);
router.delete("/", notImplemented);

export default router;
