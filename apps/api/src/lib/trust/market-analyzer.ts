import prisma from "../prisma";
import type { MarketSignals } from "@/lib/trust/types";

export async function analyzeMarket(
  tokenId: string,
  holderCount: number,
  volume24h: number,
  txCount24h: number
): Promise<MarketSignals> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentSwaps = await prisma.swapActivity.findMany({
    where: { tokenId, blockTime: { gte: since } },
    select: { traderAddress: true, volumeWei: true },
  });

  const uniqueBuyersLast24h = new Set(recentSwaps.map((s) => s.traderAddress.toLowerCase())).size;

  const top10HolderPercent =
    holderCount <= 0 ? 100 : holderCount <= 10 ? 85 : holderCount <= 50 ? 55 : 35;

  const snipersDetected = txCount24h > 0 && holderCount <= 5 ? Math.min(5, txCount24h) : 0;

  let washTradingScore = 30;
  if (txCount24h > 0 && volume24h > 0) {
    const avgTxVolume = volume24h / txCount24h;
    if (uniqueBuyersLast24h <= 2 && txCount24h >= 10) washTradingScore = 75;
    else if (avgTxVolume < 0.01 && txCount24h >= 20) washTradingScore = 60;
  }

  const priceManipulationFlags = washTradingScore > 70 ? 2 : washTradingScore > 50 ? 1 : 0;

  let score = 100;
  if (top10HolderPercent > 80) score -= 30;
  else if (top10HolderPercent > 60) score -= 15;
  else if (top10HolderPercent > 40) score -= 5;

  if (snipersDetected > 10) score -= 20;
  else if (snipersDetected > 3) score -= 10;

  if (washTradingScore > 70) score -= 25;
  else if (washTradingScore > 40) score -= 10;

  score -= priceManipulationFlags * 5;

  if (uniqueBuyersLast24h > 100) score += 10;
  else if (uniqueBuyersLast24h > 30) score += 5;

  return {
    top10HolderPercent,
    snipersDetected,
    washTradingScore,
    priceManipulationFlags,
    uniqueBuyersLast24h,
    score: Math.min(100, Math.max(0, score)),
  };
}
