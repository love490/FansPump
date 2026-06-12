import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { z } from "zod";
import { getV2FeatureFlags } from "@/lib/v2/feature-flags";
import { requireCreatorActionAuth, CreatorAuthError } from "@/lib/creator-auth";
import { awardReputation } from "@/lib/v2/reputation";

const completeSchema = z.object({
  walletAddress: z.string(),
  message: z.string(),
  signature: z.string(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const flags = getV2FeatureFlags();
  if (!flags.creatorQuests) {
    return NextResponse.json({ error: "Quests disabled" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = completeSchema.parse(body);
    const wallet = await requireCreatorActionAuth(parsed);

    const quest = await prisma.creatorQuest.findUnique({ where: { id } });
    if (!quest || quest.status !== "ACTIVE") {
      return NextResponse.json({ error: "Quest not found" }, { status: 404 });
    }

    const existing = await prisma.questCompletion.findUnique({
      where: { questId_walletAddress: { questId: id, walletAddress: wallet } },
    });
    if (existing) {
      return NextResponse.json({ error: "Already completed" }, { status: 409 });
    }

    await prisma.$transaction([
      prisma.questCompletion.create({
        data: { questId: id, walletAddress: wallet },
      }),
      prisma.creatorProfile.upsert({
        where: { walletAddress: quest.creatorWallet },
        create: {
          walletAddress: quest.creatorWallet,
          questsCompleted: 1,
          fansPumpXp: quest.rewardXp,
          reputationScore: quest.rewardReputation,
        },
        update: {
          questsCompleted: { increment: 1 },
          fansPumpXp: { increment: quest.rewardXp },
          reputationScore: { increment: quest.rewardReputation },
        },
      }),
    ]);

    if (flags.reputationSystem) {
      await awardReputation(wallet, {
        xp: Math.max(1, Math.floor(quest.rewardXp / 2)),
        reputation: Math.max(1, Math.floor(quest.rewardReputation / 2)),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof CreatorAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    console.error("[POST /api/quests/:id/complete]", e);
    return NextResponse.json({ error: "Failed to complete quest" }, { status: 500 });
  }
}
