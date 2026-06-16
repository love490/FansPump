import { Router } from "express";
import { z } from "zod";
import { LiquidityAuthError, requireLiquidityActionAuth } from "../lib/liquidity-auth";
import prisma from "../lib/prisma";
import { asyncHandler, getRouteParam } from "../lib/http-helpers";
import { publicRateLimit } from "../middleware/rateLimit";

const DEAD = "0x000000000000000000000000000000000000dEaD";

const burnSchema = z.object({
  tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  lpToken: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  creatorWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amount: z.string().min(1),
  burnAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  txHash: z.string().optional(),
  burnedAt: z.string().datetime().optional(),
  message: z.string(),
  signature: z.string(),
});

const lockSchema = z.object({
  tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  lpToken: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  lockerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  creatorWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amount: z.string().min(1),
  unlockAt: z.string().datetime(),
  txHash: z.string().optional(),
  message: z.string(),
  signature: z.string(),
});

const router = Router();

router.use(publicRateLimit);

router.post(
  "/burn",
  asyncHandler(async (req, res) => {
    try {
      const body = burnSchema.parse(req.body);
      const wallet = await requireLiquidityActionAuth({
        walletAddress: body.creatorWallet,
        message: body.message,
        signature: body.signature,
      });

      const tokenAddress = body.tokenAddress.toLowerCase();
      const token = await prisma.tokenProject.findUnique({
        where: { contractAddress: tokenAddress },
      });
      if (!token) {
        res.status(404).json({ error: "Token not found" });
        return;
      }
      if (token.creatorAddress.toLowerCase() !== wallet) {
        res.status(403).json({ error: "Only token creator can burn LP" });
        return;
      }

      const burn = await prisma.lpBurn.create({
        data: {
          tokenId: token.id,
          tokenAddress,
          lpToken: body.lpToken.toLowerCase(),
          creatorWallet: wallet,
          amount: body.amount,
          burnAddress: (body.burnAddress ?? DEAD).toLowerCase(),
          txHash: body.txHash,
          burnedAt: body.burnedAt ? new Date(body.burnedAt) : new Date(),
        },
      });

      res.json({ burn });
    } catch (e) {
      if (e instanceof LiquidityAuthError) {
        res.status(e.status).json({ error: e.message });
        return;
      }
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: e.flatten() });
        return;
      }
      res.status(400).json({ error: "Failed to record burn" });
    }
  })
);

router.post(
  "/lock",
  asyncHandler(async (req, res) => {
    try {
      const body = lockSchema.parse(req.body);
      const wallet = await requireLiquidityActionAuth({
        walletAddress: body.creatorWallet,
        message: body.message,
        signature: body.signature,
      });

      const tokenAddress = body.tokenAddress.toLowerCase();
      const token = await prisma.tokenProject.findUnique({
        where: { contractAddress: tokenAddress },
      });
      if (!token) {
        res.status(404).json({ error: "Token not found" });
        return;
      }
      if (token.creatorAddress.toLowerCase() !== wallet) {
        res.status(403).json({ error: "Only token creator can lock liquidity" });
        return;
      }

      const lock = await prisma.liquidityLock.create({
        data: {
          tokenId: token.id,
          tokenAddress,
          lpToken: body.lpToken.toLowerCase(),
          lockerAddress: body.lockerAddress.toLowerCase(),
          creatorWallet: wallet,
          amount: body.amount,
          unlockAt: new Date(body.unlockAt),
          txHash: body.txHash,
        },
      });

      res.json({ lock });
    } catch (e) {
      if (e instanceof LiquidityAuthError) {
        res.status(e.status).json({ error: e.message });
        return;
      }
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: e.flatten() });
        return;
      }
      res.status(400).json({ error: "Failed to record lock" });
    }
  })
);

router.get(
  "/:address",
  asyncHandler(async (req, res) => {
    const tokenAddress = getRouteParam(req.params.address).toLowerCase();

    const token = await prisma.tokenProject.findUnique({
      where: { contractAddress: tokenAddress },
      select: { id: true },
    });
    if (!token) {
      res.status(404).json({ error: "Token not found" });
      return;
    }

    const [locks, burns] = await Promise.all([
      prisma.liquidityLock.findMany({
        where: { tokenId: token.id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.lpBurn.findMany({
        where: { tokenId: token.id },
        orderBy: { burnedAt: "desc" },
      }),
    ]);

    const totalLocked = locks.reduce((acc, l) => acc + BigInt(l.amount), 0n);
    const totalBurned = burns.reduce((acc, b) => acc + BigInt(b.amount), 0n);
    const latestUnlockAt = locks.reduce<Date | null>(
      (acc, l) => (acc && acc > l.unlockAt ? acc : l.unlockAt),
      null
    );

    res.json({
      tokenAddress,
      locks,
      burns,
      totals: {
        lockedAmount: totalLocked.toString(),
        burnedAmount: totalBurned.toString(),
        latestUnlockAt,
      },
    });
  })
);

export default router;

