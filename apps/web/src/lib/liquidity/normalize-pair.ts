import type { MyLiquidityPosition } from "@/hooks/liquidity/useMyLiquidityPositions";
import { getLiquidityPair, type LiquidityPairId } from "@/lib/liquidity/pair-tokens";

/** Native OPN liquidity is added against WOPN on-chain after wrap. */
export function dexLiquidityPairId(pairId: LiquidityPairId): LiquidityPairId {
  return pairId === "OPN" ? "WOPN" : pairId;
}

export function normalizeLiquidityPosition(pos: MyLiquidityPosition): MyLiquidityPosition {
  const pairId = dexLiquidityPairId(pos.pairId);
  if (pairId === pos.pairId) return pos;
  const meta = getLiquidityPair(pairId);
  return {
    ...pos,
    pairId,
    pairLabel: meta.symbol,
  };
}

/** Collapse duplicate LP rows (same lpToken) — prefer WOPN over OPN label. */
export function dedupeLiquidityPositions(positions: MyLiquidityPosition[]): MyLiquidityPosition[] {
  const byLp = new Map<string, MyLiquidityPosition>();

  for (const raw of positions) {
    const pos = normalizeLiquidityPosition(raw);
    const key = pos.lpToken?.toLowerCase() || `${pos.tokenAddress}:${pos.pairId}`;

    const existing = byLp.get(key);
    if (!existing) {
      byLp.set(key, pos);
      continue;
    }

    if (existing.pairId === "OPN" && pos.pairId === "WOPN") {
      byLp.set(key, pos);
    }
  }

  return [...byLp.values()].sort((a, b) => a.tokenSymbol.localeCompare(b.tokenSymbol));
}
