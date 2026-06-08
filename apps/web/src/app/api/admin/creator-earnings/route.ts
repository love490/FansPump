import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { AdminAuthError } from "@/lib/admin-auth";
import { requirePermission } from "@/lib/admin/api-auth";
import { weiToOpnFloat } from "@/lib/analytics/fee-split";

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "creator_earnings", "GET");

    const earnings = await prisma.creatorEarning.findMany({
      select: { creatorAddress: true, tokenAddress: true, amount: true },
    });

    const grouped = new Map<string, { creator: string; tokenAddress: string; total: bigint }>();
    for (const e of earnings) {
      const key = `${e.creatorAddress}:${e.tokenAddress}`;
      const existing = grouped.get(key);
      const amount = BigInt(e.amount);
      if (existing) {
        existing.total += amount;
      } else {
        grouped.set(key, {
          creator: e.creatorAddress,
          tokenAddress: e.tokenAddress,
          total: amount,
        });
      }
    }

    const sorted = [...grouped.values()].sort((a, b) => (a.total > b.total ? -1 : a.total < b.total ? 1 : 0)).slice(0, 100);

    const tokenAddresses = [...new Set(sorted.map((e) => e.tokenAddress))];
    const tokens = await prisma.tokenProject.findMany({
      where: { contractAddress: { in: tokenAddresses } },
      select: { contractAddress: true, name: true, symbol: true },
    });
    const tokenMap = new Map(tokens.map((t) => [t.contractAddress, t]));

    const rows = sorted.map((e) => {
      const accumulated = e.total;
      const token = tokenMap.get(e.tokenAddress);
      return {
        creator: e.creator,
        token: token ? `${token.name} (${token.symbol})` : e.tokenAddress,
        tokenAddress: e.tokenAddress,
        accumulatedEarnings: weiToOpnFloat(accumulated),
        claimedEarnings: 0,
        pendingEarnings: weiToOpnFloat(accumulated),
      };
    });

    return NextResponse.json({ earnings: rows, readOnly: true });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to load earnings" }, { status: 500 });
  }
}
