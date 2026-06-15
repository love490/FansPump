import { Router } from "express";
import { notImplemented, ok } from "../lib/route-utils";
import { optionalAuthMiddleware } from "../middleware/auth";
import { publicRateLimit } from "../middleware/rateLimit";

const router = Router();

router.use(publicRateLimit);
router.use(optionalAuthMiddleware);

router.get("/", (req, res) => ok(req, res, "tokens"));

router.get("/home", notImplemented);
router.get("/search", notImplemented);
router.get("/trending", notImplemented);
router.get("/latest", notImplemented);
router.get("/:address", notImplemented);
router.post("/", notImplemented);
router.patch("/:address", notImplemented);

export default router;
