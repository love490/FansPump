import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { z } from "zod";
import { isAddress } from "viem";
import { getV2FeatureFlags } from "@/lib/v2/feature-flags";
import { requireCreatorActionAuth, CreatorAuthError } from "@/lib/creator-auth";
import { ensureCreatorProfile, awardReputation } from "@/lib/v2/reputation";

const createSchema = z.object({
  walletAddress: z.string(),
  message: z.string(),
  signature: z.string(),
  tokenAddress: z.string().optional(),
  questType: z.enum(["SOCIAL", "ENGAGEMENT", "GROWTH", "COMMUNITY"]),
  title: z.string().min(3).max(120),
  description: z.string().min(3).max(2000),
  targetUrl: z.string().url().optional().nullable(),
  targetMetric: z.string().optional().nullable(),
  targetValue: z.number().int().positive().optional().nullable(),
  rewardXp: z.number().int().min(0).max(1000).optional(),
  rewardReputation: z.number().int().min(0).max(500).optional(),
});

export async function GET(request: NextRequest) {
  const flags = getV2FeatureFlags();
  if (!flags.creatorQuests) {
    return NextResponse.json({ enabled: false, quests: [] });
  }

  const { searchParams } = new URL(request.url);
  const creatorWallet = searchParams.get("creator")?.toLowerCase();
  const tokenAddress = searchParams.get("token")?.toLowerCase();

  const where: Record<string, unknown> = { status: "ACTIVE" };
  if (creatorWallet) where.creatorWallet = creatorWallet;
  if (tokenAddress) where.tokenAddress = tokenAddress;

  try {
    const quests = await prisma.creatorQuest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { _count: { select: { completions: true } } },
    });

    return NextResponse.json({
      enabled: true,
      quests: quests.map((q) => ({
        id: q.id,
        creatorWallet: q.creatorWallet,
        tokenAddress: q.tokenAddress,
        questType: q.questType,
        title: q.title,
        description: q.description,
        targetUrl: q.targetUrl,
        targetMetric: q.targetMetric,
        targetValue: q.targetValue,
        rewardXp: q.rewardXp,
        rewardReputation: q.rewardReputation,
        status: q.status,
        completions: q._count.completions,
        createdAt: q.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("[GET /api/quests]", e);
    return NextResponse.json({ error: "Failed to load quests" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const flags = getV2FeatureFlags();
  if (!flags.creatorQuests) {
    return NextResponse.json({ error: "Quests disabled" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createSchema.parse(body);
    const wallet = await requireCreatorActionAuth(parsed);

    await ensureCreatorProfile(wallet);

    let tokenId: string | undefined;
    let tokenAddress: string | undefined;
    if (parsed.tokenAddress) {
      if (!isAddress(parsed.tokenAddress)) {
        return NextResponse.json({ error: "Invalid token address" }, { status: 400 });
      }
      const token = await prisma.tokenProject.findUnique({
        where: { contractAddress: parsed.tokenAddress.toLowerCase() },
      });
      if (!token || token.creatorAddress !== wallet) {
        return NextResponse.json({ error: "Not token creator" }, { status: 403 });
      }
      tokenId = token.id;
      tokenAddress = token.contractAddress;
    }

    const quest = await prisma.creatorQuest.create({
      data: {
        creatorWallet: wallet,
        tokenId,
        tokenAddress,
        questType: parsed.questType,
        title: parsed.title,
        description: parsed.description,
        targetUrl: parsed.targetUrl ?? null,
        targetMetric: parsed.targetMetric ?? null,
        targetValue: parsed.targetValue ?? null,
        rewardXp: parsed.rewardXp ?? 10,
        rewardReputation: parsed.rewardReputation ?? 5,
      },
    });

    return NextResponse.json({ quest: { id: quest.id, title: quest.title } });
  } catch (e) {
    if (e instanceof CreatorAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    console.error("[POST /api/quests]", e);
    return NextResponse.json({ error: "Failed to create quest" }, { status: 500 });
  }
}
