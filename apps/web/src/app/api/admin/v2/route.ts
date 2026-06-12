import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { isAddress } from "viem";
import { AdminAuthError } from "@/lib/admin-auth";
import { requirePermission } from "@/lib/admin/api-auth";

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "v2_platform", "GET");

    const [creators, quests, snapshots, trustHistory] = await Promise.all([
      prisma.creatorProfile.findMany({
        orderBy: { reputationScore: "desc" },
        take: 50,
      }),
      prisma.creatorQuest.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { _count: { select: { completions: true } } },
      }),
      prisma.tokenDailySnapshot.count(),
      prisma.trustScoreHistory.count(),
    ]);

    return NextResponse.json({
      creators,
      quests: quests.map((q) => ({
        ...q,
        completions: q._count.completions,
      })),
      analytics: {
        dailySnapshots: snapshots,
        trustHistoryEntries: trustHistory,
      },
    });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    throw e;
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { parsedBody } = await requirePermission(request, "v2_platform", "PATCH");
    const { walletAddress, status, isFeatured, questId, questStatus } = parsedBody as {
      walletAddress?: string;
      status?: string;
      isFeatured?: boolean;
      questId?: string;
      questStatus?: string;
    };

    if (walletAddress) {
      if (!isAddress(walletAddress)) {
        return NextResponse.json({ error: "Invalid wallet" }, { status: 400 });
      }
      const wallet = walletAddress.toLowerCase();
      await prisma.creatorProfile.upsert({
        where: { walletAddress: wallet },
        create: {
          walletAddress: wallet,
          status: (status as "ANONYMOUS" | "VERIFIED" | "TRUSTED") ?? "ANONYMOUS",
          isFeatured: !!isFeatured,
        },
        update: {
          ...(status ? { status: status as "ANONYMOUS" | "VERIFIED" | "TRUSTED" } : {}),
          ...(typeof isFeatured === "boolean" ? { isFeatured } : {}),
        },
      });
    }

    if (questId && questStatus) {
      await prisma.creatorQuest.update({
        where: { id: questId },
        data: { status: questStatus as "ACTIVE" | "PAUSED" | "COMPLETED" },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    throw e;
  }
}
