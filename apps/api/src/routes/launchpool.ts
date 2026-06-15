import { Router } from "express";
import { notImplemented, ok } from "../lib/route-utils";
import { optionalAuthMiddleware } from "../middleware/auth";
import { publicRateLimit } from "../middleware/rateLimit";

const router = Router();

router.use(publicRateLimit);
router.use(optionalAuthMiddleware);

router.get("/", (req, res) => ok(req, res, "launchpool"));
router.get("/:id", notImplemented);
router.get("/:id/stake", notImplemented);
router.post("/:id/stake", notImplemented);
router.delete("/:id/stake", notImplemented);

export default router;
