import { Router } from "express";
import { isAddress } from "viem";
import { getV2FeatureFlags } from "@/lib/v2/feature-flags";
import { getTrustPayload, refreshAllTrustScores } from "../lib/trust/service";
import prisma from "../lib/prisma";
import { asyncHandler, getRouteParam } from "../lib/http-helpers";
import { publicRateLimit } from "../middleware/rateLimit";

const router = Router();

router.use(publicRateLimit);

router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const flags = getV2FeatureFlags();
    if (!flags.trustScore) {
      res.json({ enabled: false, refreshed: 0 });
      return;
    }

    const secret = process.env.ANALYTICS_SYNC_SECRET ?? process.env.CRON_SECRET;
    const auth = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (secret && auth !== secret) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 984);
    const stale = await prisma.tokenProject.findMany({
      where: {
        chainId,
        isHidden: false,
        OR: [
          { trustScoreUpdatedAt: null },
          { trustScoreUpdatedAt: { lt: new Date(Date.now() - 30 * 60 * 1000) } },
        ],
      },
      take: 50,
      select: { contractAddress: true },
    });

    let refreshed = 0;
    for (const t of stale) {
      await getTrustPayload(t.contractAddress, { forceRefresh: true });
      refreshed++;
    }

    res.json({ enabled: true, refreshed });
  })
);

router.get(
  "/:address",
  asyncHandler(async (req, res) => {
    const flags = getV2FeatureFlags();
    if (!flags.trustScore) {
      res.json({ enabled: false });
      return;
    }

    const address = getRouteParam(req.params.address).toLowerCase();
    if (!isAddress(address)) {
      res.status(400).json({ error: "Invalid address" });
      return;
    }

    const payload = await getTrustPayload(address);
    if (!payload) {
      res.status(404).json({ error: "Token not found" });
      return;
    }

    const token = await prisma.tokenProject.findUnique({
      where: { contractAddress: address },
      select: {
        id: true,
        holderCount: true,
        poolStrength: true,
        volume24h: true,
        ownershipRenounced: true,
        verificationStatus: true,
        liquidityLocks: { select: { id: true }, take: 1 },
        lpBurns: { select: { id: true }, take: 1 },
      },
    });

    res.json({
      enabled: true,
      tokenId: token?.id,
      ...payload,
      health: token
        ? {
            holders: token.holderCount,
            liquidity: token.poolStrength,
            volume24h: token.volume24h,
            ownershipRenounced: token.ownershipRenounced,
            liquidityLocked: (token.liquidityLocks?.length ?? 0) > 0,
            liquidityBurned: (token.lpBurns?.length ?? 0) > 0,
            contractVerified: token.verificationStatus === "APPROVED",
          }
        : undefined,
    });
  })
);

export { refreshAllTrustScores };
export default router;
