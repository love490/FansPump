import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { z } from "zod";
import { isRegistryTokenId, registryKeyToTokenCard } from "@/lib/watchlist/registry-watchlist";

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
      registryWatchlist: true,
    },
  });

  const projectTokens =
    user?.watchlist.map((w) => ({
      ...w.token,
      featureFlags: w.token.featureFlags.toString(),
      creatorVerified: !!w.token.creator?.verification,
    })) ?? [];

  const registryTokens =
    user?.registryWatchlist
      .map((item) => registryKeyToTokenCard(item.registryKey))
      .filter((token): token is NonNullable<typeof token> => token != null) ?? [];

  return NextResponse.json({ tokens: [...registryTokens, ...projectTokens] });
}

export async function POST(request: NextRequest) {
  const body = schema.parse(await request.json());
  const wallet = body.walletAddress.toLowerCase();

  const user = await prisma.user.upsert({
    where: { walletAddress: wallet },
    create: { walletAddress: wallet },
    update: {},
  });

  if (isRegistryTokenId(body.tokenId)) {
    await prisma.registryWatchlistItem.upsert({
      where: { userId_registryKey: { userId: user.id, registryKey: body.tokenId } },
      create: { userId: user.id, registryKey: body.tokenId },
      update: {},
    });
    return NextResponse.json({ ok: true });
  }

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

  if (isRegistryTokenId(body.tokenId)) {
    await prisma.registryWatchlistItem.deleteMany({
      where: { userId: user.id, registryKey: body.tokenId },
    });
    return NextResponse.json({ ok: true });
  }

  await prisma.watchlistItem.deleteMany({
    where: { userId: user.id, tokenId: body.tokenId },
  });

  return NextResponse.json({ ok: true });
}
