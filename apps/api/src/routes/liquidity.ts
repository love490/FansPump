import { Router } from "express";
import { notImplemented, ok } from "../lib/route-utils";
import { optionalAuthMiddleware } from "../middleware/auth";
import { publicRateLimit } from "../middleware/rateLimit";

const router = Router();

router.use(publicRateLimit);
router.use(optionalAuthMiddleware);

router.get("/", (req, res) => ok(req, res, "liquidity"));
router.post("/burn", notImplemented);
router.post("/lock", notImplemented);
router.get("/:address", notImplemented);

export default router;
