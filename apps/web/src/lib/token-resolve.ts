import type { PublicClient } from "viem";
import type { Address } from "viem";
import { erc20Abi } from "@/lib/swap/abis";
import { isValidTokenAddress } from "@/lib/swap/routerAdapter";
import { getRegistryTokenByAddress } from "@/lib/token-registry";

export type ResolvedToken = {
  contractAddress: string;
  name: string;
  symbol: string;
  logoUrl?: string | null;
  decimals?: number;
};

/** Resolve token metadata: registry → API → on-chain. */
export async function resolveTokenByAddress(
  address: string,
  client?: PublicClient | null
): Promise<ResolvedToken | null> {
  if (!isValidTokenAddress(address)) return null;

  const lower = address.toLowerCase();

  const registryHit = getRegistryTokenByAddress(lower);
  if (registryHit) {
    return {
      contractAddress: lower,
      name: registryHit.name,
      symbol: registryHit.symbol,
      logoUrl: registryHit.logoUrl,
      decimals: registryHit.decimals,
    };
  }

  try {
    const r = await fetch(`/api/tokens/${lower}`);
    if (r.ok) {
      const d = await r.json();
      if (d?.token) {
        return {
          contractAddress: d.token.contractAddress,
          name: d.token.name,
          symbol: d.token.symbol,
          logoUrl: d.token.logoUrl,
        };
      }
    }
  } catch {
    // fall through
  }

  if (!client) return null;

  try {
    const addr = lower as Address;
    const [symbol, decimals] = await Promise.all([
      client.readContract({ address: addr, abi: erc20Abi, functionName: "symbol" }),
      client.readContract({ address: addr, abi: erc20Abi, functionName: "decimals" }),
    ]);
    return {
      contractAddress: lower,
      name: String(symbol),
      symbol: String(symbol),
      logoUrl: null,
      decimals: Number(decimals),
    };
  } catch {
    return null;
  }
}
