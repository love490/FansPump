import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { z } from "zod";
import { requireCreatorActionAuth, CreatorAuthError } from "@/lib/creator-auth";
import { LAUNCHPOOL_STAKE_PREFIX, LAUNCHPOOL_UNSTAKE_PREFIX } from "@/lib/launchpool/serialize";

const stakeSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  assetType: z.string().min(1).max(32),
  assetSymbol: z.string().min(1).max(32),
  assetAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional().nullable(),
  amount: z.string().regex(/^\d+$/),
  message: z.string(),
  signature: z.string(),
});

const unstakeSchema = stakeSchema.extend({
  stakeId: z.string().optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const wallet = request.nextUrl.searchParams.get("wallet")?.toLowerCase();
  if (!wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });

  try {
    const stakes = await prisma.launchpoolStake.findMany({
      where: { launchpoolId: id, walletAddress: wallet, isActive: true },
      orderBy: { stakedAt: "desc" },
    });
    return NextResponse.json({ stakes });
  } catch (e) {
    console.error("[GET /api/launchpool/[id]/stake]", e);
    return NextResponse.json({ error: "Failed to load stakes" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: launchpoolId } = await params;

  try {
    const body = stakeSchema.parse(await request.json());
    const wallet = await requireCreatorActionAuth({
      ...body,
      expectedPrefix: LAUNCHPOOL_STAKE_PREFIX,
    });

    const pool = await prisma.launchpool.findFirst({
      where: { id: launchpoolId, isPublished: true, status: { in: ["ACTIVE", "ONGOING"] } },
      include: { stakeAssets: true },
    });

    if (!pool) {
      return NextResponse.json({ error: "Launchpool is not open for staking" }, { status: 404 });
    }

    const now = new Date();
    if (now < pool.startAt || now > pool.endAt) {
      return NextResponse.json({ error: "Launchpool is outside its staking window" }, { status: 403 });
    }

    const assetAllowed = pool.stakeAssets.some(
      (asset) =>
        asset.assetSymbol.toUpperCase() === body.assetSymbol.toUpperCase() &&
        (asset.assetAddress?.toLowerCase() ?? null) === (body.assetAddress?.toLowerCase() ?? null)
    );

    if (!assetAllowed) {
      return NextResponse.json({ error: "This asset is not supported in this launchpool" }, { status: 400 });
    }

    if (BigInt(body.amount) <= 0n) {
      return NextResponse.json({ error: "Amount must be greater than zero" }, { status: 400 });
    }

    const existing = await prisma.launchpoolStake.findFirst({
      where: {
        launchpoolId,
        walletAddress: wallet,
        assetSymbol: body.assetSymbol,
        assetAddress: body.assetAddress?.toLowerCase() ?? null,
        isActive: true,
      },
    });

    if (existing) {
      const merged = (BigInt(existing.amount) + BigInt(body.amount)).toString();
      const stake = await prisma.launchpoolStake.update({
        where: { id: existing.id },
        data: { amount: merged, stakedAt: new Date() },
      });
      return NextResponse.json({ stake });
    }

    const stake = await prisma.launchpoolStake.create({
      data: {
        launchpoolId,
        walletAddress: wallet,
        assetType: body.assetType,
        assetSymbol: body.assetSymbol.toUpperCase(),
        assetAddress: body.assetAddress?.toLowerCase() ?? null,
        amount: body.amount,
      },
    });

    return NextResponse.json({ stake });
  } catch (e) {
    if (e instanceof CreatorAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("[POST /api/launchpool/[id]/stake]", e);
    return NextResponse.json({ error: "Stake failed" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id: launchpoolId } = await params;

  try {
    const body = unstakeSchema.parse(await request.json());
    const wallet = await requireCreatorActionAuth({
      ...body,
      expectedPrefix: LAUNCHPOOL_UNSTAKE_PREFIX,
    });

    const stake = body.stakeId
      ? await prisma.launchpoolStake.findFirst({
          where: { id: body.stakeId, launchpoolId, walletAddress: wallet, isActive: true },
        })
      : await prisma.launchpoolStake.findFirst({
          where: {
            launchpoolId,
            walletAddress: wallet,
            assetSymbol: body.assetSymbol.toUpperCase(),
            assetAddress: body.assetAddress?.toLowerCase() ?? null,
            isActive: true,
          },
        });

    if (!stake) {
      return NextResponse.json({ error: "No active stake found" }, { status: 404 });
    }

    const unstakeAmount = BigInt(body.amount);
    const current = BigInt(stake.amount);
    if (unstakeAmount <= 0n || unstakeAmount > current) {
      return NextResponse.json({ error: "Invalid unstake amount" }, { status: 400 });
    }

    if (unstakeAmount === current) {
      await prisma.launchpoolStake.update({
        where: { id: stake.id },
        data: { isActive: false, unstakedAt: new Date(), amount: "0" },
      });
    } else {
      await prisma.launchpoolStake.update({
        where: { id: stake.id },
        data: { amount: (current - unstakeAmount).toString() },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof CreatorAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("[DELETE /api/launchpool/[id]/stake]", e);
    return NextResponse.json({ error: "Unstake failed" }, { status: 500 });
  }
}
