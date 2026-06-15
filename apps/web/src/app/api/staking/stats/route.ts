import { NextResponse } from "next/server";
import { prisma } from "@iopn/database";

/** Public platform-wide staking totals (pool share + launchpool OPN). */
export async function GET() {
  try {
    const [active, launchpoolOpn] = await Promise.all([
      prisma.stakingPosition.findMany({
        where: { isActive: true },
        select: { wallet: true, assetType: true, amount: true },
      }),
      prisma.launchpoolStake.findMany({
        where: { isActive: true, assetSymbol: { equals: "OPN", mode: "insensitive" } },
        select: { walletAddress: true, amount: true },
      }),
    ]);

    let totalOpnWei = 0n;
    let totalLpAmount = 0n;
    let lpStakeCount = 0;
    const stakers = new Set<string>();

    for (const row of active) {
      stakers.add(row.wallet.toLowerCase());
      try {
        const amount = BigInt(row.amount || "0");
        if (row.assetType === "OPN") {
          totalOpnWei += amount;
        } else {
          totalLpAmount += amount;
          lpStakeCount += 1;
        }
      } catch {
        /* skip invalid amount */
      }
    }

    for (const row of launchpoolOpn) {
      stakers.add(row.walletAddress.toLowerCase());
      try {
        totalOpnWei += BigInt(row.amount || "0");
      } catch {
        /* skip */
      }
    }

    return NextResponse.json(
      {
        activeStakers: stakers.size,
        activeStakePositions: active.length + launchpoolOpn.length,
        totalStakedOpnWei: totalOpnWei.toString(),
        totalStakedLpAmount: totalLpAmount.toString(),
        lpStakeCount,
      },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
    );
  } catch (e) {
    console.error("[GET /api/staking/stats]", e);
    return NextResponse.json({ error: "Failed to load staking stats" }, { status: 500 });
  }
}
