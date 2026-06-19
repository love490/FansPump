import { Router } from "express";
import { isAddress } from "viem";
import { asyncHandler } from "@/lib/http-helpers";
import { publicRateLimit } from "@/middleware/rateLimit";
import { detectAddressType } from "@/lib/trustscan/address-detector";
import { scanToken } from "@/lib/trustscan/token-scanner";
import { scanWallet } from "@/lib/trustscan/wallet-scanner";

const router = Router();

router.use(publicRateLimit);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const address = typeof req.body?.address === "string" ? req.body.address.trim() : "";

    if (!address || !isAddress(address)) {
      res.status(400).json({ error: "Invalid address" });
      return;
    }

    const type = await detectAddressType(address);

    if (type === "token") {
      const result = await scanToken(address);
      res.setHeader("Cache-Control", "public, max-age=300");
      res.json({ type: "token", result });
      return;
    }

    if (type === "wallet") {
      const result = await scanWallet(address);
      res.setHeader("Cache-Control", "public, max-age=300");
      res.json({ type: "wallet", result });
      return;
    }

    res.status(400).json({ error: "Could not determine address type" });
  })
);

export default router;
