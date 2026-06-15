import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { serializeLaunchpool } from "@/lib/launchpool/serialize";
import { getLaunchpoolStakeStats } from "@/lib/launchpool/rewards";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const pool = await prisma.launchpool.findFirst({
      where: { id, isPublished: true },
      include: { stakeAssets: true },
    });

    if (!pool) {
      return NextResponse.json({ error: "Launchpool not found" }, { status: 404 });
    }

    const stats = await getLaunchpoolStakeStats(pool.id);
    return NextResponse.json({ pool: serializeLaunchpool(pool, stats) });
  } catch (e) {
    console.error("[GET /api/launchpool/[id]]", e);
    return NextResponse.json({ error: "Failed to load launchpool" }, { status: 500 });
  }
}
