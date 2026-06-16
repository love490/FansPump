import prisma from "../prisma";
import type { CreatorSignals } from "@/lib/trust/types";

export async function analyzeCreator(creatorAddress: string): Promise<CreatorSignals> {
  const wallet = creatorAddress.toLowerCase();

  const [tokens, profile, questCount, completionCount] = await Promise.all([
    prisma.tokenProject.findMany({
      where: { creatorAddress: wallet },
      select: { id: true, isScam: true, createdAt: true, isHidden: true },
    }),
    prisma.creatorProfile.findUnique({
      where: { walletAddress: wallet },
      select: { questsCompleted: true, reputationScore: true },
    }),
    prisma.creatorQuest.count({ where: { creatorWallet: wallet } }),
    prisma.questCompletion.count({
      where: { quest: { creatorWallet: wallet } },
    }),
  ]);

  if (tokens.length === 0 && !profile) {
    return {
      priorTokenCount: 0,
      priorRugCount: 0,
      avgTokenSurvival30d: 0,
      questCompletionRate: 0,
      score: 30,
    };
  }

  const priorTokenCount = tokens.length;
  const priorRugCount = tokens.filter((t) => t.isScam).length;
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const matureTokens = tokens.filter((t) => t.createdAt.getTime() <= thirtyDaysAgo);
  const survived = matureTokens.filter((t) => !t.isHidden && !t.isScam);
  const avgTokenSurvival30d =
    matureTokens.length > 0 ? (survived.length / matureTokens.length) * 100 : priorTokenCount > 0 ? 50 : 0;

  const questCompletionRate =
    questCount > 0 ? completionCount / questCount : profile?.questsCompleted ? 0.5 : 0;

  let score = 30;
  if (priorTokenCount > 0) {
    if (priorRugCount === 0) score += 30;
    else score -= priorRugCount * 15;
  }

  if (avgTokenSurvival30d >= 70) score += 25;
  else if (avgTokenSurvival30d >= 40) score += 15;

  if (questCompletionRate >= 0.8) score += 15;
  else if (questCompletionRate >= 0.5) score += 8;

  if ((profile?.reputationScore ?? 0) >= 500) score += 10;

  return {
    priorTokenCount,
    priorRugCount,
    avgTokenSurvival30d,
    questCompletionRate,
    score: Math.min(100, Math.max(0, score)),
  };
}
