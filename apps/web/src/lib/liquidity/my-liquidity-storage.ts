import type { LiquidityPairId } from "@/lib/liquidity/pair-tokens";

export type StoredLiquidityPosition = {
  tokenAddress: string;
  tokenSymbol: string;
  pairId: LiquidityPairId;
  pairSymbol: string;
  txHash?: string;
  addedAt: string;
};

const STORAGE_KEY = "fanspump:my-liquidity";

export function loadStoredLiquidityPositions(): StoredLiquidityPosition[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredLiquidityPosition[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLiquidityPosition(entry: StoredLiquidityPosition) {
  if (typeof window === "undefined") return;
  const existing = loadStoredLiquidityPositions();
  const key = `${entry.tokenAddress.toLowerCase()}:${entry.pairId}`;
  const next = [
    entry,
    ...existing.filter(
      (p) => `${p.tokenAddress.toLowerCase()}:${p.pairId}` !== key
    ),
  ].slice(0, 50);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
