import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { z } from "zod";
import { AdminAuthError } from "@/lib/admin-auth";
import { requireAdminSessionWithCsrf, requirePermission } from "@/lib/admin/api-auth";
import { roleHasPermission } from "@/lib/admin/roles";
import { serializeLaunchpool } from "@/lib/launchpool/serialize";
import { getLaunchpoolStakeStats } from "@/lib/launchpool/rewards";

const updateSchema = z.object({
  title: z.string().min(3).max(120).optional(),
  description: z.string().min(10).max(2000).optional(),
  detailInfo: z.string().min(10).max(8000).optional(),
  status: z.enum(["ACTIVE", "ONGOING", "ENDED"]).optional(),
  rewardTokenSymbol: z.string().min(1).max(16).optional(),
  rewardTokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional().nullable(),
  totalRewardUsd: z.number().positive().optional(),
  totalRewardAmount: z.string().regex(/^\d+$/).optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  durationLabel: z.string().max(64).optional().nullable(),
  isPublished: z.boolean().optional(),
  stakeAssets: z
    .array(
      z.object({
        assetType: z.string().min(1),
        assetSymbol: z.string().min(1),
        assetAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional().nullable(),
      })
    )
    .min(1)
    .optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

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

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const { parsedBody } = await requirePermission(request, "launchpool", "PATCH");
    const body = updateSchema.parse(parsedBody);

    const existing = await prisma.launchpool.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Launchpool not found" }, { status: 404 });

    if (body.stakeAssets) {
      await prisma.launchpoolStakeAsset.deleteMany({ where: { launchpoolId: id } });
    }

    const pool = await prisma.launchpool.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        detailInfo: body.detailInfo,
        status: body.status,
        rewardTokenSymbol: body.rewardTokenSymbol?.toUpperCase(),
        rewardTokenAddress: body.rewardTokenAddress?.toLowerCase(),
        totalRewardUsd: body.totalRewardUsd,
        totalRewardAmount: body.totalRewardAmount,
        startAt: body.startAt ? new Date(body.startAt) : undefined,
        endAt: body.endAt ? new Date(body.endAt) : undefined,
        durationLabel: body.durationLabel,
        isPublished: body.isPublished,
        ...(body.stakeAssets
          ? {
              stakeAssets: {
                create: body.stakeAssets.map((asset) => ({
                  assetType: asset.assetType.toUpperCase(),
                  assetSymbol: asset.assetSymbol.toUpperCase(),
                  assetAddress: asset.assetAddress?.toLowerCase() ?? null,
                })),
              },
            }
          : {}),
      },
      include: { stakeAssets: true },
    });

    const stats = await getLaunchpoolStakeStats(pool.id);
    return NextResponse.json({ pool: serializeLaunchpool(pool, stats) });
  } catch (e) {
    return adminErrorResponse(e);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const { admin } = await requireAdminSessionWithCsrf(request);
    if (!roleHasPermission(admin.role, "launchpool")) {
      throw new AdminAuthError("Insufficient permissions");
    }

    await prisma.launchpool.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return adminErrorResponse(e);
  }
}
