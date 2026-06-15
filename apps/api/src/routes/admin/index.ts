import { Router } from "express";
import { notImplemented, ok } from "../../lib/route-utils";
import { adminAuthMiddleware } from "../../middleware/adminAuth";
import { adminRateLimit } from "../../middleware/rateLimit";
import authRouter from "./auth";
import settingsRouter from "./settings";
import launchpoolRouter from "./launchpool";

const router = Router();

router.use(adminRateLimit);

router.get("/", (req, res) => ok(req, res, "admin"));

router.use("/auth", authRouter);
router.use("/settings", settingsRouter);
router.use("/launchpool", launchpoolRouter);

router.get("/check", notImplemented);
router.get("/me", adminAuthMiddleware, notImplemented);
router.get("/stats", adminAuthMiddleware, notImplemented);
router.get("/overview", adminAuthMiddleware, notImplemented);
router.get("/analytics", adminAuthMiddleware, notImplemented);
router.get("/activity-logs", adminAuthMiddleware, notImplemented);
router.get("/admins", adminAuthMiddleware, notImplemented);
router.post("/admins", adminAuthMiddleware, notImplemented);
router.get("/roles", adminAuthMiddleware, notImplemented);
router.get("/tokens", adminAuthMiddleware, notImplemented);
router.get("/tokens/:id", adminAuthMiddleware, notImplemented);
router.patch("/tokens/:id", adminAuthMiddleware, notImplemented);
router.get("/verification", adminAuthMiddleware, notImplemented);
router.patch("/verification", adminAuthMiddleware, notImplemented);
router.get("/creator-verifications", adminAuthMiddleware, notImplemented);
router.get("/creator-earnings", adminAuthMiddleware, notImplemented);
router.get("/factory-admin", adminAuthMiddleware, notImplemented);
router.post("/authorize", adminAuthMiddleware, notImplemented);
router.get("/announcements", adminAuthMiddleware, notImplemented);
router.post("/announcements", adminAuthMiddleware, notImplemented);
router.get("/v2", adminAuthMiddleware, notImplemented);

export default router;
