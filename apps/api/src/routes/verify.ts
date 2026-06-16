import { Router } from "express";
import { verifyMessage } from "viem";
import { z } from "zod";
import prisma from "../lib/prisma";
import { asyncHandler, queryToSearchParams } from "../lib/http-helpers";
import { publicRateLimit } from "../middleware/rateLimit";

const schema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/i),
  signature: z.string(),
  message: z.string(),
});

const router = Router();

router.use(publicRateLimit);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    try {
      const body = schema.parse(req.body);
      const wallet = body.walletAddress.toLowerCase() as `0x${string}`;

      const prefix = process.env.VERIFICATION_MESSAGE_PREFIX ?? "FansPump Creator Verification";
      if (!body.message.startsWith(prefix)) {
        res.status(400).json({ error: "Invalid verification message" });
        return;
      }

      const valid = await verifyMessage({
        address: wallet,
        message: body.message,
        signature: body.signature as `0x${string}`,
      });

      if (!valid) {
        res.status(401).json({ error: "Signature verification failed" });
        return;
      }

      await prisma.user.upsert({
        where: { walletAddress: wallet },
        create: { walletAddress: wallet },
        update: {},
      });

      const verification = await prisma.creatorVerification.upsert({
        where: { walletAddress: wallet },
        create: {
          walletAddress: wallet,
          signature: body.signature,
          message: body.message,
        },
        update: {
          signature: body.signature,
          message: body.message,
          verifiedAt: new Date(),
        },
      });

      res.json({ verified: true, verification });
    } catch {
      res.status(400).json({ error: "Verification failed" });
    }
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const wallet = queryToSearchParams(req.query).get("wallet")?.toLowerCase();
    if (!wallet) {
      res.json({ verified: false });
      return;
    }

    const v = await prisma.creatorVerification.findUnique({ where: { walletAddress: wallet } });
    res.json({ verified: !!v });
  })
);

export default router;

