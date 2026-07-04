import { Router } from "express";
import { isAddress } from "viem";
import { fetchWalletTokenBalances } from "@/lib/wallet/token-balances";
import { asyncHandler, getRouteParam, setCacheControl } from "../lib/http-helpers";
import { publicRateLimit } from "../middleware/rateLimit";

const router = Router();

router.use(publicRateLimit);

router.get(
  "/:address/tokens",
  asyncHandler(async (req, res) => {
    const address = getRouteParam(req.params.address)?.trim() ?? "";
    if (!isAddress(address)) {
      res.status(400).json({ error: "Invalid wallet address" });
      return;
    }

    try {
      const tokens = await fetchWalletTokenBalances(address);
      setCacheControl(res, "private, max-age=15, stale-while-revalidate=30");
      res.json({ tokens });
    } catch (e) {
      console.error("[GET /api/wallet/:address/tokens]", e);
      res.status(500).json({ error: "Failed to load wallet tokens" });
    }
  })
);

export default router;
