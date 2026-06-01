import { NextRequest, NextResponse } from "next/server";
import { prisma, VoteType } from "@iopn/database";
import { z } from "zod";

const schema = z.object({
  tokenId: z.string(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/i),
  voteType: z.enum(["BULLISH", "NEUTRAL", "BEARISH"]),
});

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());
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

    return NextResponse.json({ vote });
  } catch {
    return NextResponse.json({ error: "Invalid vote" }, { status: 400 });
  }
}
