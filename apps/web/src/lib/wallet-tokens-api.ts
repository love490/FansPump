import { apiUrl } from "@/lib/api";

export type WalletTokenRow = {
  contractAddress: string;
  name: string;
  symbol: string;
  logoUrl?: string | null;
  balance: string;
  decimals: number;
  isCreator?: boolean;
};

/** All ERC-20 tokens held by a wallet on OPN Chain. */
export async function fetchWalletTokens(walletAddress: string): Promise<WalletTokenRow[]> {
  const wallet = walletAddress.toLowerCase();
  const res = await fetch(apiUrl(`/api/wallet/${encodeURIComponent(wallet)}/tokens`), {
    cache: "no-store",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const msg = typeof data?.error === "string" ? data.error : `Failed to load wallet tokens (${res.status})`;
    throw new Error(msg);
  }
  const data = (await res.json()) as { tokens?: WalletTokenRow[] };
  return data.tokens ?? [];
}
