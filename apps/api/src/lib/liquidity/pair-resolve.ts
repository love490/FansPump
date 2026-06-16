import type { Address, PublicClient } from "viem";
import { uniswapV2FactoryAbi } from "@/lib/liquidity/abis";
import type { LiquidityPairId } from "@/lib/liquidity/pair-tokens";

const ZERO_PAIR = "0x0000000000000000000000000000000000000000";

export function quoteCandidatesForPairId(
  pairId: LiquidityPairId,
  weth: Address,
  wopnExplicit: Address,
  usdt: Address
): Address[] {
  const seen = new Set<string>();
  const add = (addr: string) => {
    const lower = addr.toLowerCase();
    if (lower && lower !== ZERO_PAIR) seen.add(lower);
  };

  if (pairId === "USDT") {
    add(usdt);
  } else if (pairId === "WOPN") {
    add(wopnExplicit);
    add(weth);
  } else {
    add(weth);
    add(wopnExplicit);
  }

  return [...seen].map((s) => s as Address);
}

export async function findPairAddress(
  client: PublicClient,
  factory: Address,
  token: Address,
  quoteCandidates: Address[]
): Promise<Address | null> {
  for (const quote of quoteCandidates) {
    try {
      const pair = await client.readContract({
        address: factory,
        abi: uniswapV2FactoryAbi,
        functionName: "getPair",
        args: [token, quote],
      });
      if (pair && pair.toLowerCase() !== ZERO_PAIR) {
        return pair as Address;
      }
    } catch {
      // try next quote candidate
    }
  }
  return null;
}
