import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { z } from "zod";
import { AdminAuthError } from "@/lib/admin-auth";
import { requirePermission } from "@/lib/admin/api-auth";
import { serializeLaunchpool } from "@/lib/launchpool/serialize";
import { getLaunchpoolStakeStats } from "@/lib/launchpool/rewards";

const stakeAssetSchema = z.object({
  assetType: z.string().min(1),
  assetSymbol: z.string().min(1),
  assetAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional().nullable(),
});

const createSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(2000),
  detailInfo: z.string().min(10).max(8000),
  status: z.enum(["ACTIVE", "ONGOING", "ENDED"]),
  rewardTokenSymbol: z.string().min(1).max(16),
  rewardTokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional().nullable(),
  totalRewardUsd: z.number().positive(),
  totalRewardAmount: z.string().regex(/^\d+$/),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  durationLabel: z.string().max(64).optional().nullable(),
  isPublished: z.boolean().optional(),
  stakeAssets: z.array(stakeAssetSchema).min(1),
});

function adminErrorResponse(e: unknown) {
  if (e instanceof AdminAuthError) {
    return NextResponse.json({ error: e.message }, { status: 401 });
  }
  if (e instanceof z.ZodError) {
    return NextResponse.json({ error: e.flatten() }, { status: 400 });
  }
  console.error(e);
  return NextResponse.json({ error: "Admin request failed" }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "launchpool", "GET");

    const pools = await prisma.launchpool.findMany({
      include: { stakeAssets: true },
      orderBy: { createdAt: "desc" },
    });

    const serialized = await Promise.all(
      pools.map(async (pool) => {
        const stats = await getLaunchpoolStakeStats(pool.id);
        return serializeLaunchpool(pool, stats);
      })
    );

    return NextResponse.json({ pools: serialized });
  } catch (e) {
    return adminErrorResponse(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { parsedBody } = await requirePermission(request, "launchpool", "POST");
    const body = createSchema.parse(parsedBody);

    const pool = await prisma.launchpool.create({
      data: {
        title: body.title,
        description: body.description,
        detailInfo: body.detailInfo,
        status: body.status,
        rewardTokenSymbol: body.rewardTokenSymbol.toUpperCase(),
        rewardTokenAddress: body.rewardTokenAddress?.toLowerCase() ?? null,
        totalRewardUsd: body.totalRewardUsd,
        totalRewardAmount: body.totalRewardAmount,
        startAt: new Date(body.startAt),
        endAt: new Date(body.endAt),
        durationLabel: body.durationLabel ?? null,
        isPublished: body.isPublished ?? true,
        stakeAssets: {
          create: body.stakeAssets.map((asset) => ({
            assetType: asset.assetType.toUpperCase(),
            assetSymbol: asset.assetSymbol.toUpperCase(),
            assetAddress: asset.assetAddress?.toLowerCase() ?? null,
          })),
        },
      },
      include: { stakeAssets: true },
    });

    return NextResponse.json({
      pool: serializeLaunchpool(pool, { totalStakedAmount: "0", participantCount: 0 }),
    });
  } catch (e) {
    return adminErrorResponse(e);
  }
}
