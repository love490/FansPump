import { Router } from "express";
import { z } from "zod";
import {
  discoverPlatformPools,
  getLiquidityPoolAnalytics,
  listLiquidityPools,
  serializePool,
  syncPoolFromChain,
} from "../lib/pools/index";
import prisma from "../lib/prisma";
import { asyncHandler, getRouteParam } from "../lib/http-helpers";
import { publicRateLimit } from "../middleware/rateLimit";

const bodySchema = z.object({
  poolAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

const router = Router();

router.use(publicRateLimit);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    try {
      const limit = Number(req.query.limit ?? "50");
      const token =
        typeof req.query.token === "string" ? req.query.token.toLowerCase() : undefined;
      const shouldDiscover = req.query.discover === "true";

      if (shouldDiscover) {
        await discoverPlatformPools();
      }

      let pools = await listLiquidityPools(Number.isFinite(limit) ? limit : 50);

      if (token) {
        pools = pools.filter(
          (p) => p.token0.toLowerCase() === token || p.token1.toLowerCase() === token
        );
      }

      const analytics = await getLiquidityPoolAnalytics();

      res.json({
        pools,
        analytics: {
          ...analytics,
          note: "Read-only analytics — AMM math and reward emissions are not active yet.",
        },
      });
    } catch (e) {
      console.error("[GET /api/pools]", e);
      res.status(500).json({ error: "Failed to load pools" });
    }
  })
);

router.post(
  "/discover",
  asyncHandler(async (_req, res) => {
    try {
      const synced = await discoverPlatformPools();
      const [pools, analytics] = await Promise.all([
        listLiquidityPools(),
        getLiquidityPoolAnalytics(),
      ]);

      res.json({
        syncedCount: synced.length,
        pools,
        analytics: {
          ...analytics,
          note: "Pools indexed from on-chain liquidity.",
        },
      });
    } catch (e) {
      console.error("[POST /api/pools/discover]", e);
      res.status(500).json({ error: "Failed to discover pools" });
    }
  })
);

router.post(
  "/sync",
  asyncHandler(async (req, res) => {
    try {
      const body = bodySchema.parse(req.body);
      const pool = await syncPoolFromChain(body.poolAddress.toLowerCase());

      if (!pool) {
        res.status(400).json({ error: "Could not index pool" });
        return;
      }

      res.json({ pool });
    } catch (e) {
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid pool address" });
        return;
      }
      console.error("[POST /api/pools/sync]", e);
      res.status(500).json({ error: "Failed to sync pool" });
    }
  })
);

router.get(
  "/:address",
  asyncHandler(async (req, res) => {
    const address = getRouteParam(req.params.address);
    const normalized = address.toLowerCase();

    if (!/^0x[a-f0-9]{40}$/.test(normalized)) {
      res.status(400).json({ error: "Invalid pool address" });
      return;
    }

    try {
      const sync = req.query.sync === "1";

      if (sync) {
        const synced = await syncPoolFromChain(normalized);
        if (synced) {
          res.json({ pool: synced, synced: true });
          return;
        }
      }

      const row = await prisma.liquidityPool.findUnique({ where: { poolAddress: normalized } });
      if (!row) {
        res.status(404).json({
          error: "Pool not indexed yet",
          hint: "Use ?sync=1 to index from chain",
        });
        return;
      }

      res.json({ pool: serializePool(row), synced: false });
    } catch (e) {
      console.error("[GET /api/pools/[address]]", e);
      res.status(500).json({ error: "Failed to load pool" });
    }
  })
);

export default router;

