import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { z } from "zod";
import { requireCreatorActionAuth, CreatorAuthError } from "@/lib/creator-auth";
import { getStakingPlatformConfig, serializeStakingPosition } from "@/lib/staking/config";
import { computeWalletStakingTier } from "@/lib/staking/tier";

const stakeSchema = z.object({
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  assetType: z.enum(["OPN", "LP_TOKEN"]),
  asset: z.string().min(1).max(128),
  amount: z.string().regex(/^\d+$/),
  poolAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
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
    const [positions, config] = await Promise.all([
      prisma.stakingPosition.findMany({
        where: { wallet, isActive: true },
        orderBy: { stakedAt: "desc" },
      }),
      getStakingPlatformConfig(),
    ]);

    const tier = await computeWalletStakingTier(wallet, config);

    return NextResponse.json({
      positions: positions.map(serializeStakingPosition),
      walletTier: tier,
      rewardsActive: false,
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

    const config = await getStakingPlatformConfig();

    if (body.assetType === "OPN" && !config.opnStakingEnabled) {
      return NextResponse.json({ error: "OPN staking is disabled" }, { status: 403 });
    }
    if (body.assetType === "LP_TOKEN" && !config.lpStakingEnabled) {
      return NextResponse.json({ error: "LP staking is disabled" }, { status: 403 });
    }

    const extraOpnWei = body.assetType === "OPN" ? BigInt(body.amount) : 0n;
    const tier =
      body.tier ??
      (body.assetType === "OPN"
        ? await computeWalletStakingTier(wallet, config, extraOpnWei)
        : null);

    const position = await prisma.stakingPosition.create({
      data: {
        wallet,
        assetType: body.assetType,
        asset: body.asset.toLowerCase(),
        amount: body.amount,
        poolAddress: body.poolAddress?.toLowerCase() ?? null,
        tokenAddress: body.tokenAddress?.toLowerCase() ?? null,
        tier,
      },
    });

    return NextResponse.json({
      position: serializeStakingPosition(position),
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
        amount: z.string().regex(/^\d+$/).optional(),
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

    const stakedWei = BigInt(existing.amount);
    const unstakeWei = body.amount ? BigInt(body.amount) : stakedWei;

    if (unstakeWei <= 0n) {
      return NextResponse.json({ error: "Unstake amount must be greater than zero" }, { status: 400 });
    }
    if (unstakeWei > stakedWei) {
      return NextResponse.json({ error: "Unstake amount exceeds staked balance" }, { status: 400 });
    }

    const remaining = stakedWei - unstakeWei;
    const config = await getStakingPlatformConfig();

    let position;
    if (remaining === 0n) {
      position = await prisma.stakingPosition.update({
        where: { id: existing.id },
        data: { isActive: false, unstakedAt: new Date(), amount: "0" },
      });
    } else {
      position = await prisma.stakingPosition.update({
        where: { id: existing.id },
        data: { amount: remaining.toString() },
      });
      if (existing.assetType === "OPN") {
        const tier = await computeWalletStakingTier(wallet, config);
        position = await prisma.stakingPosition.update({
          where: { id: existing.id },
          data: { tier },
        });
      }
    }

    return NextResponse.json({
      position: serializeStakingPosition(position),
      unstakedAmount: unstakeWei.toString(),
      remainingAmount: remaining.toString(),
    });
  } catch (e) {
    if (e instanceof CreatorAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("[DELETE /api/staking]", e);
    return NextResponse.json({ error: "Failed to unstake" }, { status: 500 });
  }
}
