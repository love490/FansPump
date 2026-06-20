import { Router } from "express";
import { ok } from "../../lib/route-utils";
import { adminRateLimit } from "../../middleware/rateLimit";
import authRouter from "./auth";
import settingsRouter from "./settings";
import launchpoolRouter from "./launchpool";
import bountiesRouter from "./bounties";
import coreRouter from "./core";
import tokensRouter from "./tokens";

const router = Router();

router.use(adminRateLimit);

router.get("/", (req, res) => ok(req, res, "admin"));

router.use("/auth", authRouter);
router.use("/settings", settingsRouter);
router.use("/launchpool", launchpoolRouter);
router.use("/bounties", bountiesRouter);
router.use("/tokens", tokensRouter);
router.use(coreRouter);

export default router;

