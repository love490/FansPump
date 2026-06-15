import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import type { LaunchpoolStatus } from "@iopn/database";
import { serializeLaunchpool } from "@/lib/launchpool/serialize";
import { getLaunchpoolStakeStats } from "@/lib/launchpool/rewards";

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status")?.toUpperCase() as LaunchpoolStatus | null;

  try {
    const pools = await prisma.launchpool.findMany({
      where: {
        isPublished: true,
        ...(status ? { status } : {}),
      },
      include: { stakeAssets: true },
      orderBy: [{ status: "asc" }, { startAt: "desc" }],
    });

    const serialized = await Promise.all(
      pools.map(async (pool) => {
        const stats = await getLaunchpoolStakeStats(pool.id);
        return serializeLaunchpool(pool, stats);
      })
    );

    return NextResponse.json({ pools: serialized });
  } catch (e) {
    console.error("[GET /api/launchpool]", e);
    return NextResponse.json({ error: "Failed to load launchpools" }, { status: 500 });
  }
}
