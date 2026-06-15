import { Router } from "express";
import { notImplemented, ok } from "../lib/route-utils";
import { uploadRateLimit } from "../middleware/rateLimit";
import { isS3Configured } from "../lib/s3";

const router = Router();

router.use(uploadRateLimit);

router.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "upload",
    s3Configured: isS3Configured(),
  });
});

router.post("/", notImplemented);

export default router;
