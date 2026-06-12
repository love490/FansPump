import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { AdminAuthError } from "@/lib/admin-auth";
import { requireAdminSession } from "@/lib/admin/api-auth";

export async function GET(request: NextRequest) {
  try {
    await requireAdminSession(request);

    const q = request.nextUrl.searchParams.get("q")?.trim();
    const tokens = await prisma.tokenProject.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { symbol: { contains: q, mode: "insensitive" } },
              { contractAddress: { contains: q.toLowerCase() } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        creator: { include: { verification: true } },
      },
    });

    return NextResponse.json({
      tokens: tokens.map((t) => ({
        ...t,
        featureFlags: t.featureFlags.toString(),
        creatorVerified: !!t.creator?.verification,
      })),
    });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to load tokens" }, { status: 500 });
  }
}
