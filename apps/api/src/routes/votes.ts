import { Router } from "express";
import { VoteType } from "@iopn/database";
import { z } from "zod";
import prisma from "../lib/prisma";
import { asyncHandler } from "../lib/http-helpers";
import { publicRateLimit } from "../middleware/rateLimit";

const schema = z.object({
  tokenId: z.string(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/i),
  voteType: z.enum(["BULLISH", "NEUTRAL", "BEARISH"]),
});

const router = Router();

router.use(publicRateLimit);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    try {
      const body = schema.parse(req.body);
      const wallet = body.walletAddress.toLowerCase();

      const user = await prisma.user.upsert({
        where: { walletAddress: wallet },
        create: { walletAddress: wallet },
        update: {},
      });

      const vote = await prisma.tokenVote.upsert({
        where: { userId_tokenId: { userId: user.id, tokenId: body.tokenId } },
        create: {
          userId: user.id,
          tokenId: body.tokenId,
          voteType: body.voteType as VoteType,
        },
        update: { voteType: body.voteType as VoteType },
      });

      res.json({ vote });
    } catch {
      res.status(400).json({ error: "Invalid vote" });
    }
  })
);

export default router;

