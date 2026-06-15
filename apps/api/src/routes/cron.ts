import { Router } from "express";
import { notImplemented, ok } from "../lib/route-utils";

const router = Router();

router.get("/", (req, res) => ok(req, res, "cron"));
router.post("/metrics-snapshot", notImplemented);

export default router;
