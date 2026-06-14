import { NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import {
  DEFAULT_SYSTEM,
  SETTING_KEYS,
  getPlatformSetting,
} from "@/lib/admin/platform-settings";

export async function GET() {
  try {
    const system = await getPlatformSetting(SETTING_KEYS.SYSTEM, DEFAULT_SYSTEM);

    const announcements = await prisma.tokenAnnouncement.findMany({
      where: { isHidden: false },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        token: { select: { contractAddress: true, symbol: true, name: true } },
      },
    });

    return NextResponse.json(
      {
        banner: system.announcementBanner?.trim() ?? "",
        announcements: announcements.map((a) => ({
          id: a.id,
          title: a.title,
          tokenSymbol: a.token.symbol,
          tokenName: a.token.name,
          href: `/token/${a.token.contractAddress}`,
        })),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (e) {
    console.error("[GET /api/platform/promo]", e);
    return NextResponse.json({ banner: "", announcements: [] });
  }
}
