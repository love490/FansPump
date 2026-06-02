import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { z } from "zod";
import { LiquidityAuthError, requireLiquidityActionAuth } from "@/lib/liquidity-auth";

const schema = z.object({
  tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  lpToken: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  lockerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  creatorWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amount: z.string().min(1), // raw uint256 string
  unlockAt: z.string().datetime(),
  txHash: z.string().optional(),
  message: z.string(),
  signature: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());
    const wallet = await requireLiquidityActionAuth({
      walletAddress: body.creatorWallet,
      message: body.message,
      signature: body.signature,
    });

    const tokenAddress = body.tokenAddress.toLowerCase();
    const token = await prisma.tokenProject.findUnique({
      where: { contractAddress: tokenAddress },
    });
    if (!token) return NextResponse.json({ error: "Token not found" }, { status: 404 });
    if (token.creatorAddress.toLowerCase() !== wallet) {
      return NextResponse.json({ error: "Only token creator can lock liquidity" }, { status: 403 });
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

    return NextResponse.json({ lock });
  } catch (e) {
    if (e instanceof LiquidityAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to record lock" }, { status: 400 });
  }
}

