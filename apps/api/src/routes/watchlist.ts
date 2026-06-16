import { Router } from "express";
import { z } from "zod";
import { isRegistryTokenId, registryKeyToTokenCard } from "@/lib/watchlist/registry-watchlist";
import prisma from "../lib/prisma";
import { asyncHandler, queryToSearchParams } from "../lib/http-helpers";
import { publicRateLimit } from "../middleware/rateLimit";

const schema = z.object({
  tokenId: z.string(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/i),
});

const router = Router();

router.use(publicRateLimit);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const wallet = queryToSearchParams(req.query).get("wallet")?.toLowerCase();
    if (!wallet) {
      res.status(400).json({ error: "wallet required" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress: wallet },
      include: {
        watchlist: {
          include: {
            token: { include: { creator: { include: { verification: true } } } },
          },
        },
        registryWatchlist: true,
      },
    });

    const projectTokens =
      user?.watchlist.map((w) => ({
        ...w.token,
        featureFlags: w.token.featureFlags.toString(),
        creatorVerified: !!w.token.creator?.verification,
      })) ?? [];

    const registryTokens =
      user?.registryWatchlist
        .map((item) => registryKeyToTokenCard(item.registryKey))
        .filter((token): token is NonNullable<typeof token> => token != null) ?? [];

    res.json({ tokens: [...registryTokens, ...projectTokens] });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = schema.parse(req.body);
    const wallet = body.walletAddress.toLowerCase();

    const user = await prisma.user.upsert({
      where: { walletAddress: wallet },
      create: { walletAddress: wallet },
      update: {},
    });

    if (isRegistryTokenId(body.tokenId)) {
      await prisma.registryWatchlistItem.upsert({
        where: { userId_registryKey: { userId: user.id, registryKey: body.tokenId } },
        create: { userId: user.id, registryKey: body.tokenId },
        update: {},
      });
      res.json({ ok: true });
      return;
    }

    await prisma.watchlistItem.upsert({
      where: { userId_tokenId: { userId: user.id, tokenId: body.tokenId } },
      create: { userId: user.id, tokenId: body.tokenId },
      update: {},
    });

    res.json({ ok: true });
  })
);

router.delete(
  "/",
  asyncHandler(async (req, res) => {
    const body = schema.parse(req.body);
    const wallet = body.walletAddress.toLowerCase();
    const user = await prisma.user.findUnique({ where: { walletAddress: wallet } });
    if (!user) {
      res.json({ ok: true });
      return;
    }

    if (isRegistryTokenId(body.tokenId)) {
      await prisma.registryWatchlistItem.deleteMany({
        where: { userId: user.id, registryKey: body.tokenId },
      });
      res.json({ ok: true });
      return;
    }

    await prisma.watchlistItem.deleteMany({
      where: { userId: user.id, tokenId: body.tokenId },
    });

    res.json({ ok: true });
  })
);

export default router;
