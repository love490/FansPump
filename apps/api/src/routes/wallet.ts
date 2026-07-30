import { Router } from "express";
import { isAddress } from "viem";
import { formatActivityAmount } from "@/lib/dashboard/activities";
import { isNativeOpnSlug } from "@/lib/tokens/token-address";
import { fetchWalletTokenBalances } from "@/lib/wallet/token-balances";
import prisma from "../lib/prisma";
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

type WalletTokenActivity = {
  id: string;
  kind: "swap" | "lock" | "burn" | "token";
  title: string;
  amount?: string;
  occurredAt: string;
  txHash?: string | null;
};

/**
 * Wallet-scoped history for one token — swaps, locks, and burns involving this wallet.
 * Used by `/dashboard/token/[address]`.
 */
router.get(
  "/:address/token/:tokenAddress/activity",
  asyncHandler(async (req, res) => {
    const wallet = getRouteParam(req.params.address)?.trim().toLowerCase() ?? "";
    const tokenParam = getRouteParam(req.params.tokenAddress)?.trim() ?? "";

    if (!isAddress(wallet)) {
      res.status(400).json({ error: "Invalid wallet address" });
      return;
    }

    if (isNativeOpnSlug(tokenParam)) {
      setCacheControl(res, "private, max-age=30, stale-while-revalidate=60");
      res.json({ activities: [] as WalletTokenActivity[] });
      return;
    }

    if (!isAddress(tokenParam)) {
      res.status(400).json({ error: "Invalid token address" });
      return;
    }

    const tokenAddress = tokenParam.toLowerCase();
    const walletMatch = { equals: wallet, mode: "insensitive" as const };

    try {
      const [swaps, locks, burns, created] = await Promise.all([
        prisma.swapActivity.findMany({
          where: {
            tokenAddress,
            traderAddress: walletMatch,
          },
          orderBy: { blockTime: "desc" },
          take: 40,
          select: {
            id: true,
            volumeWei: true,
            txHash: true,
            blockTime: true,
          },
        }),
        prisma.liquidityLock.findMany({
          where: { tokenAddress, creatorWallet: walletMatch },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            amount: true,
            txHash: true,
            createdAt: true,
            unlockAt: true,
          },
        }),
        prisma.lpBurn.findMany({
          where: { tokenAddress, creatorWallet: walletMatch },
          orderBy: { burnedAt: "desc" },
          take: 20,
          select: {
            id: true,
            amount: true,
            txHash: true,
            burnedAt: true,
          },
        }),
        prisma.tokenProject.findFirst({
          where: {
            contractAddress: tokenAddress,
            creatorAddress: walletMatch,
          },
          select: {
            id: true,
            symbol: true,
            createdAt: true,
            txHash: true,
          },
        }),
      ]);

      const activities: WalletTokenActivity[] = [];

      for (const swap of swaps) {
        activities.push({
          id: `swap-${swap.id}`,
          kind: "swap",
          title: "Swap",
          amount: formatActivityAmount(swap.volumeWei, 18),
          occurredAt: swap.blockTime.toISOString(),
          txHash: swap.txHash,
        });
      }

      for (const lock of locks) {
        activities.push({
          id: `lock-${lock.id}`,
          kind: "lock",
          title: "Liquidity locked",
          amount: formatActivityAmount(lock.amount, 18, "LP"),
          occurredAt: lock.createdAt.toISOString(),
          txHash: lock.txHash,
        });
      }

      for (const burn of burns) {
        activities.push({
          id: `burn-${burn.id}`,
          kind: "burn",
          title: "LP burned",
          amount: formatActivityAmount(burn.amount, 18, "LP"),
          occurredAt: burn.burnedAt.toISOString(),
          txHash: burn.txHash,
        });
      }

      if (created) {
        activities.push({
          id: `token-${created.id}`,
          kind: "token",
          title: `Created ${created.symbol}`,
          occurredAt: created.createdAt.toISOString(),
          txHash: created.txHash,
        });
      }

      activities.sort(
        (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
      );

      setCacheControl(res, "private, max-age=20, stale-while-revalidate=40");
      res.json({ activities: activities.slice(0, 50) });
    } catch (e) {
      console.error("[GET /api/wallet/:address/token/:tokenAddress/activity]", e);
      res.status(500).json({ error: "Failed to load token activity" });
    }
  })
);

export default router;
