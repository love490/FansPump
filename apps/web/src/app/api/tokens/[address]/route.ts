import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const token = await prisma.tokenProject.findUnique({
    where: { contractAddress: address.toLowerCase() },
    include: {
      creator: { include: { verification: true } },
      votes: true,
    },
  });

  if (!token) {
    return NextResponse.json({ error: "Token not found" }, { status: 404 });
  }

  await prisma.tokenProject.update({
    where: { id: token.id },
    data: { viewCount: { increment: 1 } },
  });

  const voteCounts = token.votes.reduce(
    (acc, v) => {
      acc[v.voteType] = (acc[v.voteType] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return NextResponse.json({
    token: {
      ...token,
      featureFlags: token.featureFlags.toString(),
      creatorVerified: !!token.creator?.verification,
      voteCounts,
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const body = await request.json();
  const wallet = body.walletAddress?.toLowerCase();

  const existing = await prisma.tokenProject.findUnique({
    where: { contractAddress: address.toLowerCase() },
  });

  if (!existing || existing.creatorAddress !== wallet) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const allowed = [
    "logoUrl",
    "bannerUrl",
    "description",
    "website",
    "telegram",
    "twitter",
    "discord",
    "github",
  ] as const;

  const data: Record<string, string | null> = {};
  const history: { field: string }[] = [];

  for (const field of allowed) {
    if (field in body) {
      data[field] = body[field];
      history.push({ field });
    }
  }

  const token = await prisma.tokenProject.update({
    where: { id: existing.id },
    data: {
      ...data,
      metadataHistory: { create: history },
    },
  });

  return NextResponse.json({
    token: { ...token, featureFlags: token.featureFlags.toString() },
  });
}
