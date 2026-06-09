import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { z } from "zod";
import { requireCreatorActionAuth, CreatorAuthError } from "@/lib/creator-auth";

const stakeSchema = z.object({
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  assetType: z.enum(["OPN", "LP_TOKEN"]),
  asset: z.string().min(1).max(128),
  amount: z.string().regex(/^\d+$/),
  tier: z.string().optional(),
  message: z.string(),
  signature: z.string(),
});

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet")?.toLowerCase();
  if (!wallet) {
    return NextResponse.json({ error: "wallet required" }, { status: 400 });
  }

  try {
    const positions = await prisma.stakingPosition.findMany({
      where: { wallet, isActive: true },
      orderBy: { stakedAt: "desc" },
    });

    return NextResponse.json({
      positions: positions.map((p) => ({
        ...p,
        stakedAt: p.stakedAt.toISOString(),
        unstakedAt: p.unstakedAt?.toISOString() ?? null,
      })),
    });
  } catch (e) {
    console.error("[GET /api/staking]", e);
    return NextResponse.json({ error: "Failed to load staking positions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = stakeSchema.parse(await request.json());
    const wallet = await requireCreatorActionAuth({
      walletAddress: body.wallet,
      message: body.message,
      signature: body.signature,
    });

    const position = await prisma.stakingPosition.create({
      data: {
        wallet,
        assetType: body.assetType,
        asset: body.asset.toLowerCase(),
        amount: body.amount,
        tier: body.tier ?? null,
      },
    });

    return NextResponse.json({
      position: {
        ...position,
        stakedAt: position.stakedAt.toISOString(),
        unstakedAt: null,
      },
    });
  } catch (e) {
    if (e instanceof CreatorAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("[POST /api/staking]", e);
    return NextResponse.json({ error: "Failed to record stake" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = z
      .object({
        wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
        positionId: z.string(),
        message: z.string(),
        signature: z.string(),
      })
      .parse(await request.json());

    const wallet = await requireCreatorActionAuth({
      walletAddress: body.wallet,
      message: body.message,
      signature: body.signature,
    });

    const existing = await prisma.stakingPosition.findFirst({
      where: { id: body.positionId, wallet, isActive: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Position not found" }, { status: 404 });
    }

    const position = await prisma.stakingPosition.update({
      where: { id: existing.id },
      data: { isActive: false, unstakedAt: new Date() },
    });

    return NextResponse.json({
      position: {
        ...position,
        stakedAt: position.stakedAt.toISOString(),
        unstakedAt: position.unstakedAt?.toISOString() ?? null,
      },
    });
  } catch (e) {
    if (e instanceof CreatorAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[DELETE /api/staking]", e);
    return NextResponse.json({ error: "Failed to unstake" }, { status: 500 });
  }
}
