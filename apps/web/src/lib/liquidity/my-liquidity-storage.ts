import type { LiquidityPairId } from "@/lib/liquidity/pair-tokens";

export type StoredLiquidityPosition = {
  walletAddress: string;
  tokenAddress: string;
  tokenSymbol: string;
  pairId: LiquidityPairId;
  pairSymbol: string;
  lpToken?: string;
  txHash?: string;
  addedAt: string;
};

const STORAGE_KEY = "fanspump:my-liquidity";

function storageKey(wallet?: string): string {
  if (!wallet) return STORAGE_KEY;
  return `${STORAGE_KEY}:${wallet.toLowerCase()}`;
}

export function loadStoredLiquidityPositions(wallet?: string): StoredLiquidityPosition[] {
  if (typeof window === "undefined") return [];
  const keys = wallet
    ? [storageKey(wallet), STORAGE_KEY]
    : [STORAGE_KEY];

  const merged = new Map<string, StoredLiquidityPosition>();

  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as StoredLiquidityPosition[];
      if (!Array.isArray(parsed)) continue;
      for (const entry of parsed) {
        const walletAddress = (entry.walletAddress ?? wallet ?? "").toLowerCase();
        if (wallet && walletAddress && walletAddress !== wallet.toLowerCase()) continue;
        const posKey = `${entry.tokenAddress.toLowerCase()}:${entry.pairId}`;
        merged.set(posKey, {
          ...entry,
          walletAddress: walletAddress || wallet?.toLowerCase() || "",
          tokenAddress: entry.tokenAddress.toLowerCase(),
        });
      }
    } catch {
      // skip corrupt entry
    }
  }

  return [...merged.values()];
}

export function saveLiquidityPosition(
  entry: Omit<StoredLiquidityPosition, "walletAddress"> & { walletAddress: string }
) {
  if (typeof window === "undefined") return;
  const wallet = entry.walletAddress.toLowerCase();
  const normalized: StoredLiquidityPosition = {
    ...entry,
    walletAddress: wallet,
    tokenAddress: entry.tokenAddress.toLowerCase(),
  };
  const existing = loadStoredLiquidityPositions(wallet);
  const posKey = `${normalized.tokenAddress}:${normalized.pairId}`;
  const next = [
    normalized,
    ...existing.filter((p) => `${p.tokenAddress}:${p.pairId}` !== posKey),
  ].slice(0, 50);
  localStorage.setItem(storageKey(wallet), JSON.stringify(next));
}
