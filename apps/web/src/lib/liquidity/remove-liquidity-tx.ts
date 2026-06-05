import { type Address, type PublicClient } from "viem";
import { dexRouterLiquidityAbi } from "@/lib/liquidity/dex-router-abi";
import type { LiquidityPair } from "@/lib/liquidity/pair-tokens";

export type NativeRemoveLiquidityFn = "removeLiquidityOPN" | "removeLiquidityETH";

const nativeRemoveFns: NativeRemoveLiquidityFn[] = ["removeLiquidityOPN", "removeLiquidityETH"];

export async function resolveNativeRemoveLiquidityFn(
  client: PublicClient,
  router: Address,
  account: Address,
  token: Address,
  liquidity: bigint,
  to: Address,
  deadline: bigint
): Promise<NativeRemoveLiquidityFn> {
  let lastError: unknown;
  for (const functionName of nativeRemoveFns) {
    try {
      await client.simulateContract({
        address: router,
        abi: dexRouterLiquidityAbi,
        functionName,
        args: [token, liquidity, 0n, 0n, to, deadline],
        account,
      });
      return functionName;
    } catch (e) {
      lastError = e;
    }
  }
  const detail = lastError instanceof Error ? lastError.message : lastError ? String(lastError) : "unknown error";
  throw new Error(`DEX router does not support native OPN remove liquidity (${detail}).`);
}

export async function simulateRemoveLiquidity(params: {
  client: PublicClient;
  router: Address;
  account: Address;
  token: Address;
  pair: LiquidityPair;
  liquidity: bigint;
  deadline: bigint;
}) {
  const { client, router, account, token, pair, liquidity, deadline } = params;

  if (pair.isNative) {
    const functionName = await resolveNativeRemoveLiquidityFn(
      client,
      router,
      account,
      token,
      liquidity,
      account,
      deadline
    );
    return {
      functionName,
      args: [token, liquidity, 0n, 0n, account, deadline] as const,
    };
  }

  if (!pair.address) {
    throw new Error("Pair token address is not configured");
  }

  await client.simulateContract({
    address: router,
    abi: dexRouterLiquidityAbi,
    functionName: "removeLiquidity",
    args: [token, pair.address, liquidity, 0n, 0n, account, deadline],
    account,
  });

  return {
    functionName: "removeLiquidity" as const,
    args: [token, pair.address, liquidity, 0n, 0n, account, deadline] as const,
  };
}
