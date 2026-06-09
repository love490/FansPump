import type { Address, PublicClient } from "viem";
import { DEX_ROUTER_ADDRESS } from "@/lib/wagmi";
import { uniswapV2RouterAbi } from "@/lib/liquidity/abis";
import { opnChainConfig } from "@/lib/chain-config/opn";

const ZERO = "0x0000000000000000000000000000000000000000";

/** Uniswap V2 pair factory — never the IOPn token creation factory. */
export async function resolveDexFactory(client: PublicClient): Promise<Address> {
  try {
    const fromRouter = (await client.readContract({
      address: DEX_ROUTER_ADDRESS,
      abi: uniswapV2RouterAbi,
      functionName: "factory",
    })) as Address;
    if (fromRouter && fromRouter.toLowerCase() !== ZERO) {
      return fromRouter;
    }
  } catch (e) {
    console.warn("[liquidity] DEX router factory() failed:", e);
  }

  const configured = opnChainConfig.contracts.dexFactory;
  if (configured && configured.toLowerCase() !== ZERO) {
    return configured;
  }

  throw new Error("DEX pair factory is not configured");
}
