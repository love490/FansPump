import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { AdminAuthError } from "@/lib/admin-auth";
import { requireAdminSession } from "@/lib/admin/api-auth";

export async function GET(request: NextRequest) {
  try {
    await requireAdminSession(request);

    const [tokenCount, userCount, featuredCount, verificationCount, voteCount] = await Promise.all([
      prisma.tokenProject.count(),
      prisma.user.count(),
      prisma.tokenProject.count({ where: { isFeatured: true } }),
      prisma.creatorVerification.count(),
      prisma.tokenVote.count(),
    ]);

    const recentTokens = await prisma.tokenProject.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { name: true, symbol: true, contractAddress: true, createdAt: true },
    });

    return NextResponse.json({
      stats: {
        tokenCount,
        userCount,
        featuredCount,
        verificationCount,
        voteCount,
      },
      recentTokens,
    });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
