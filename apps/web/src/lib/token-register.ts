import { getActiveChainId } from "@/lib/chain-config/opn";
import type { TokenCardData } from "@/components/tokens/token-card";

export type RegisterTokenResponse = {
  success: boolean;
  contractAddress: string;
  token: {
    id: string;
    contractAddress: string;
    name: string;
    symbol: string;
    creatorAddress: string;
    chainId: number;
    featureFlags: string;
  };
};

export type MyTokensResponse = {
  tokens: TokenCardData[];
};

/** Fetch tokens created by the connected wallet. */
export async function fetchMyTokens(walletAddress: string): Promise<TokenCardData[]> {
  const creator = walletAddress.toLowerCase();
  const chainId = getActiveChainId();
  const url = `/api/tokens?creator=${encodeURIComponent(creator)}&limit=100&chainId=${chainId}`;

  console.log("[my-tokens] Fetching tokens for creator:", creator, "chainId:", chainId);

  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const msg = typeof data?.error === "string" ? data.error : `Failed to load tokens (${res.status})`;
    throw new Error(msg);
  }

  const data = (await res.json()) as MyTokensResponse;
  console.log("[my-tokens] Loaded", data.tokens?.length ?? 0, "token(s)");
  return data.tokens ?? [];
}

/** Persist token metadata after on-chain deployment. */
export async function registerTokenMetadata(payload: Record<string, unknown>): Promise<RegisterTokenResponse> {
  console.log("[deploy] Saving to DB… contract:", payload.contractAddress);

  const res = await fetch("/api/tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg = typeof data?.error === "string" ? data.error : "Failed to register token (API error)";
    console.error("[deploy] Database save failed:", msg);
    throw new Error(msg);
  }

  if (!data?.success || !data?.contractAddress) {
    console.error("[deploy] Invalid API response shape:", data);
    throw new Error("API did not return contractAddress");
  }

  console.log("[deploy] Token saved to database:", data.contractAddress);
  return data as RegisterTokenResponse;
}
