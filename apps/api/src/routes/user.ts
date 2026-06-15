import { Router } from "express";
import { notImplemented, ok } from "../lib/route-utils";
import { optionalAuthMiddleware } from "../middleware/auth";
import { publicRateLimit } from "../middleware/rateLimit";

const router = Router();

router.use(publicRateLimit);
router.use(optionalAuthMiddleware);

router.get("/", (req, res) => ok(req, res, "user"));
router.get("/dashboard", notImplemented);
router.get("/profile", notImplemented);
router.patch("/profile", notImplemented);
router.get("/follows", notImplemented);
router.post("/follows", notImplemented);
router.delete("/follows", notImplemented);
router.post("/claim-rewards", notImplemented);

export default router;
