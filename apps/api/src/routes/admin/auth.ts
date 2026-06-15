import { Router } from "express";
import { notImplemented, ok } from "../../lib/route-utils";
import { authRateLimit } from "../../middleware/rateLimit";

const router = Router();

router.use(authRateLimit);

router.get("/", (req, res) => ok(req, res, "admin-auth"));

router.post("/login", notImplemented);
router.post("/logout", notImplemented);
router.get("/me", notImplemented);
router.post("/forgot-password", notImplemented);
router.post("/reset-password", notImplemented);
router.post("/change-password", notImplemented);
router.post("/verify-2fa", notImplemented);
router.post("/2fa/setup", notImplemented);
router.post("/2fa/enable", notImplemented);
router.post("/2fa/disable", notImplemented);

export default router;
