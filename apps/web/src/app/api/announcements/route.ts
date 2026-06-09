import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { z } from "zod";
import { isAnnouncementType } from "@iopn/shared";
import { requireCreatorActionAuth, CreatorAuthError } from "@/lib/creator-auth";

const createSchema = z.object({
  tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  creatorWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  title: z.string().min(1).max(120),
  content: z.string().min(1).max(5000),
  type: z.string(),
  message: z.string(),
  signature: z.string(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenAddress = searchParams.get("tokenAddress")?.toLowerCase();
  const creatorWallet = searchParams.get("creatorWallet")?.toLowerCase();
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);

  const where: Record<string, unknown> = { isHidden: false };
  if (tokenAddress) where.tokenAddress = tokenAddress;
  if (creatorWallet) where.creatorWallet = creatorWallet;

  try {
    const announcements = await prisma.tokenAnnouncement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({
      announcements: announcements.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("[GET /api/announcements]", e);
    return NextResponse.json({ error: "Failed to load announcements" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = createSchema.parse(await request.json());

    if (!isAnnouncementType(body.type)) {
      return NextResponse.json({ error: "Invalid announcement type" }, { status: 400 });
    }

    const wallet = await requireCreatorActionAuth({
      walletAddress: body.creatorWallet,
      message: body.message,
      signature: body.signature,
    });

    const tokenAddress = body.tokenAddress.toLowerCase();
    const token = await prisma.tokenProject.findUnique({
      where: { contractAddress: tokenAddress },
    });

    if (!token || token.creatorAddress !== wallet) {
      return NextResponse.json({ error: "Only the token creator can post announcements" }, { status: 403 });
    }

    const announcement = await prisma.tokenAnnouncement.create({
      data: {
        tokenId: token.id,
        tokenAddress,
        creatorWallet: wallet,
        title: body.title,
        content: body.content,
        type: body.type,
      },
    });

    return NextResponse.json({
      announcement: { ...announcement, createdAt: announcement.createdAt.toISOString() },
    });
  } catch (e) {
    if (e instanceof CreatorAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("[POST /api/announcements]", e);
    return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 });
  }
}
