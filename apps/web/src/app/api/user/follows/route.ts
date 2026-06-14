import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { z } from "zod";

const walletSchema = z.string().regex(/^0x[a-f0-9]{40}$/i);

const followSchema = z.object({
  walletAddress: walletSchema,
  creatorWallet: walletSchema,
});

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet")?.toLowerCase();
  const creator = request.nextUrl.searchParams.get("creator")?.toLowerCase();

  if (!wallet || !/^0x[a-f0-9]{40}$/.test(wallet)) {
    return NextResponse.json({ error: "wallet required" }, { status: 400 });
  }

  try {
    if (creator) {
      if (!/^0x[a-f0-9]{40}$/.test(creator)) {
        return NextResponse.json({ error: "Invalid creator wallet" }, { status: 400 });
      }
      const row = await prisma.creatorFollow.findUnique({
        where: {
          followerWallet_creatorWallet: {
            followerWallet: wallet,
            creatorWallet: creator,
          },
        },
      });
      return NextResponse.json({ following: Boolean(row) });
    }

    const rows = await prisma.creatorFollow.findMany({
      where: { followerWallet: wallet },
      include: {
        creator: {
          select: {
            walletAddress: true,
            username: true,
            profileImageUrl: true,
            verification: { select: { id: true } },
            tokenProjects: {
              take: 1,
              orderBy: { createdAt: "desc" },
              select: { name: true, symbol: true, contractAddress: true },
            },
            _count: { select: { tokenProjects: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      creators: rows.map((row) => ({
        walletAddress: row.creator.walletAddress,
        username: row.creator.username,
        profileImageUrl: row.creator.profileImageUrl,
        creatorVerified: Boolean(row.creator.verification),
        tokenCount: row.creator._count.tokenProjects,
        sampleToken: row.creator.tokenProjects[0] ?? null,
        followedAt: row.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("[GET /api/user/follows]", e);
    return NextResponse.json({ error: "Failed to load follows" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = followSchema.parse(await request.json());
    const followerWallet = body.walletAddress.toLowerCase();
    const creatorWallet = body.creatorWallet.toLowerCase();

    if (followerWallet === creatorWallet) {
      return NextResponse.json({ error: "You cannot follow yourself" }, { status: 400 });
    }

    await prisma.user.upsert({
      where: { walletAddress: followerWallet },
      create: { walletAddress: followerWallet },
      update: {},
    });
    await prisma.user.upsert({
      where: { walletAddress: creatorWallet },
      create: { walletAddress: creatorWallet },
      update: {},
    });

    await prisma.creatorFollow.upsert({
      where: {
        followerWallet_creatorWallet: { followerWallet, creatorWallet },
      },
      create: { followerWallet, creatorWallet },
      update: {},
    });

    return NextResponse.json({ ok: true, following: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    console.error("[POST /api/user/follows]", e);
    return NextResponse.json({ error: "Failed to follow creator" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = followSchema.parse(await request.json());
    const followerWallet = body.walletAddress.toLowerCase();
    const creatorWallet = body.creatorWallet.toLowerCase();

    await prisma.creatorFollow.deleteMany({
      where: { followerWallet, creatorWallet },
    });

    return NextResponse.json({ ok: true, following: false });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    console.error("[DELETE /api/user/follows]", e);
    return NextResponse.json({ error: "Failed to unfollow creator" }, { status: 500 });
  }
}
