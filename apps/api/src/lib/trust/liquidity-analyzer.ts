import prisma from "../prisma";
import type { LiquiditySignals } from "@/lib/trust/types";

export async function analyzeLiquidity(
  tokenId: string,
  poolStrength: number,
  hasLpBurn: boolean
): Promise<LiquiditySignals> {
  const now = Date.now();
  const locks = await prisma.liquidityLock.findMany({
    where: { tokenId },
    select: { unlockAt: true },
  });

  const liquidityLocked = locks.length > 0;
  let lockDurationDays = 0;
  if (liquidityLocked) {
    const activeLocks = locks.filter((l) => l.unlockAt.getTime() > now);
    if (activeLocks.length > 0) {
      const maxUnlock = Math.max(...activeLocks.map((l) => l.unlockAt.getTime()));
      lockDurationDays = Math.max(0, Math.round((maxUnlock - now) / (1000 * 60 * 60 * 24)));
    }
  }

  const liquidityDepthUSD = poolStrength;
  const removalEventsLast30d = 0;
  const lpConcentration = 100;

  let score = 0;
  if (hasLpBurn) {
    score += 50;
  } else if (liquidityLocked) {
    score += 40;
    if (lockDurationDays >= 365) score += 10;
    else if (lockDurationDays >= 180) score += 5;
  }

  if (liquidityDepthUSD >= 50_000) score += 20;
  else if (liquidityDepthUSD >= 10_000) score += 10;
  else if (liquidityDepthUSD >= 1_000) score += 5;

  if (removalEventsLast30d === 0) score += 20;
  else if (removalEventsLast30d <= 2) score += 10;

  if (lpConcentration <= 30) score += 10;
  else if (lpConcentration <= 60) score += 5;

  return {
    liquidityLocked: liquidityLocked || hasLpBurn,
    lockDurationDays,
    liquidityDepthUSD,
    removalEventsLast30d,
    lpConcentration,
    score: Math.min(100, score),
  };
}
