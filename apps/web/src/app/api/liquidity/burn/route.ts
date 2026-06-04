import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { z } from "zod";
import { LiquidityAuthError, requireLiquidityActionAuth } from "@/lib/liquidity-auth";

const DEAD = "0x000000000000000000000000000000000000dEaD";

const schema = z.object({
  tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  lpToken: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  creatorWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amount: z.string().min(1), // raw uint256 string
  burnAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  txHash: z.string().optional(),
  burnedAt: z.string().datetime().optional(),
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
      return NextResponse.json({ error: "Only token creator can burn LP" }, { status: 403 });
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

    return NextResponse.json({ burn });
  } catch (e) {
    if (e instanceof LiquidityAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to record burn" }, { status: 400 });
  }
}

