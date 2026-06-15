import { Router } from "express";
import { notImplemented, ok } from "../../lib/route-utils";
import { adminAuthMiddleware } from "../../middleware/adminAuth";

const router = Router();

router.use(adminAuthMiddleware);

router.get("/", (req, res) => ok(req, res, "admin-launchpool"));
router.post("/", notImplemented);
router.get("/:id", notImplemented);
router.patch("/:id", notImplemented);
router.delete("/:id", notImplemented);
router.post("/:id/distribute", notImplemented);

export default router;
