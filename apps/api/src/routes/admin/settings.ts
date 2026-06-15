import { Router } from "express";
import { notImplemented, ok } from "../../lib/route-utils";
import { adminAuthMiddleware } from "../../middleware/adminAuth";

const router = Router();

router.use(adminAuthMiddleware);

router.get("/", (req, res) => ok(req, res, "admin-settings"));

router.get("/system", notImplemented);
router.patch("/system", notImplemented);
router.get("/staking", notImplemented);
router.patch("/staking", notImplemented);
router.get("/discovery", notImplemented);
router.patch("/discovery", notImplemented);
router.get("/creation-fees", notImplemented);
router.patch("/creation-fees", notImplemented);
router.get("/trading-fees", notImplemented);
router.patch("/trading-fees", notImplemented);
router.get("/pool-share", notImplemented);
router.patch("/pool-share", notImplemented);
router.get("/treasury", notImplemented);
router.patch("/treasury", notImplemented);
router.get("/bridge", notImplemented);
router.patch("/bridge", notImplemented);
router.get("/security", notImplemented);
router.patch("/security", notImplemented);
router.get("/trust-panel", notImplemented);
router.patch("/trust-panel", notImplemented);
router.get("/v2/feature-flags", notImplemented);
router.patch("/v2/feature-flags", notImplemented);

export default router;
