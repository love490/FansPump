import { Router } from "express";
import { isAddress } from "viem";
import { getV2FeatureFlags } from "@/lib/v2/feature-flags";
import { buildTokenTrustPayload } from "@/lib/v2/trust-service";
import prisma from "../lib/prisma";
import { asyncHandler, getRouteParam } from "../lib/http-helpers";
import { publicRateLimit } from "../middleware/rateLimit";

const router = Router();

router.use(publicRateLimit);

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

    try {
      const token = await prisma.tokenProject.findUnique({
        where: { contractAddress: address },
        select: {
          id: true,
          featureFlags: true,
          ownershipRenounced: true,
          verificationStatus: true,
          isScam: true,
          creatorAddress: true,
          trustScore: true,
          trustScoreUpdatedAt: true,
          holderCount: true,
          volume24h: true,
          poolStrength: true,
          liquidityLocks: { select: { id: true }, take: 1 },
          lpBurns: { select: { id: true }, take: 1 },
          creator: { select: { verification: { select: { id: true } } } },
        },
      });

      if (!token) {
        res.status(404).json({ error: "Token not found" });
        return;
      }

      const trust = await buildTokenTrustPayload(token);

      res.json({
        enabled: true,
        tokenId: token.id,
        cachedScore: token.trustScore,
        cachedAt: token.trustScoreUpdatedAt?.toISOString() ?? null,
        trust,
        health: {
          holders: token.holderCount,
          liquidity: token.poolStrength,
          volume24h: token.volume24h,
          ownershipRenounced: token.ownershipRenounced,
          liquidityLocked: (token.liquidityLocks?.length ?? 0) > 0,
          liquidityBurned: (token.lpBurns?.length ?? 0) > 0,
          contractVerified: token.verificationStatus === "APPROVED",
        },
      });
    } catch (e) {
      console.error("[GET /api/trust/:address]", e);
      res.status(500).json({ error: "Failed to load trust score" });
    }
  })
);

export default router;
