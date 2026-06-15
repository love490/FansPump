import { Router } from "express";
import { notImplemented, ok } from "../lib/route-utils";
import { publicRateLimit } from "../middleware/rateLimit";

const router = Router();

router.use(publicRateLimit);

router.get("/", (req, res) => ok(req, res, "platform"));
router.get("/promo", notImplemented);
router.get("/creation-fees", notImplemented);

export default router;
