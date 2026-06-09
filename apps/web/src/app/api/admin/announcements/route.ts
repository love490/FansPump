import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { AdminAuthError } from "@/lib/admin-auth";
import { requirePermission } from "@/lib/admin/api-auth";

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "announcements", "GET");
    const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? 50), 100);

    const announcements = await prisma.tokenAnnouncement.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { token: { select: { name: true, symbol: true } } },
    });

    return NextResponse.json({
      announcements: announcements.map((a) => ({
        id: a.id,
        tokenAddress: a.tokenAddress,
        tokenName: a.token.name,
        tokenSymbol: a.token.symbol,
        creatorWallet: a.creatorWallet,
        title: a.title,
        type: a.type,
        isHidden: a.isHidden,
        createdAt: a.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to load announcements" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { parsedBody } = await requirePermission(request, "announcements", "PATCH");
    const id = String(parsedBody.id ?? "");
    const isHidden = Boolean(parsedBody.isHidden);

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const announcement = await prisma.tokenAnnouncement.update({
      where: { id },
      data: { isHidden },
    });

    return NextResponse.json({
      announcement: { ...announcement, createdAt: announcement.createdAt.toISOString() },
    });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update announcement" }, { status: 500 });
  }
}
