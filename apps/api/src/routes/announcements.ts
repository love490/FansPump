import { Router } from "express";
import { notImplemented, ok } from "../lib/route-utils";
import { publicRateLimit } from "../middleware/rateLimit";

const router = Router();

router.use(publicRateLimit);

router.get("/", (req, res) => ok(req, res, "announcements"));
router.post("/", notImplemented);

export default router;
