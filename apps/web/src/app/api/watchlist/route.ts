import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { z } from "zod";

const schema = z.object({
  tokenId: z.string(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/i),
});

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet")?.toLowerCase();
  if (!wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { walletAddress: wallet },
    include: {
      watchlist: {
        include: {
          token: { include: { creator: { include: { verification: true } } } },
        },
      },
    },
  });

  const tokens =
    user?.watchlist.map((w) => ({
      ...w.token,
      featureFlags: w.token.featureFlags.toString(),
      creatorVerified: !!w.token.creator?.verification,
    })) ?? [];

  return NextResponse.json({ tokens });
}

export async function POST(request: NextRequest) {
  const body = schema.parse(await request.json());
  const wallet = body.walletAddress.toLowerCase();

  const user = await prisma.user.upsert({
    where: { walletAddress: wallet },
    create: { walletAddress: wallet },
    update: {},
  });

  await prisma.watchlistItem.upsert({
    where: { userId_tokenId: { userId: user.id, tokenId: body.tokenId } },
    create: { userId: user.id, tokenId: body.tokenId },
    update: {},
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const body = schema.parse(await request.json());
  const wallet = body.walletAddress.toLowerCase();
  const user = await prisma.user.findUnique({ where: { walletAddress: wallet } });
  if (!user) return NextResponse.json({ ok: true });

  await prisma.watchlistItem.deleteMany({
    where: { userId: user.id, tokenId: body.tokenId },
  });

  return NextResponse.json({ ok: true });
}
