import { Router } from "express";
import { notImplemented, ok } from "../lib/route-utils";
import { publicRateLimit } from "../middleware/rateLimit";

const router = Router();

router.use(publicRateLimit);

router.get("/", (req, res) => ok(req, res, "analytics"));
router.get("/global", notImplemented);
router.get("/extended", notImplemented);
router.post("/sync", notImplemented);

export default router;
