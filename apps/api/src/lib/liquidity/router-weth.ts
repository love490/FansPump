import type { Address, PublicClient } from "viem";
import { uniswapV2RouterAbi } from "@/lib/liquidity/abis";

export async function readRouterWeth(client: PublicClient, router: Address): Promise<Address> {
  try {
    return (await client.readContract({
      address: router,
      abi: uniswapV2RouterAbi,
      functionName: "WOPN",
    })) as Address;
  } catch {
    return (await client.readContract({
      address: router,
      abi: uniswapV2RouterAbi,
      functionName: "WETH",
    })) as Address;
  }
}
