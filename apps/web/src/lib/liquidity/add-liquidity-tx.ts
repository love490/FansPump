import { type Address, type PublicClient } from "viem";
import { dexRouterLiquidityAbi } from "@/lib/liquidity/dex-router-abi";
import type { LiquidityPair } from "@/lib/liquidity/pair-tokens";

export type NativeAddLiquidityFn = "addLiquidityOPN" | "addLiquidityETH";

const nativeLiquidityFns: NativeAddLiquidityFn[] = ["addLiquidityOPN", "addLiquidityETH"];

export async function resolveNativeAddLiquidityFn(
  client: PublicClient,
  router: Address,
  account: Address,
  token: Address,
  amountToken: bigint,
  amountNative: bigint,
  to: Address,
  deadline: bigint
): Promise<NativeAddLiquidityFn> {
  let lastError: unknown;
  for (const functionName of nativeLiquidityFns) {
    try {
      await client.simulateContract({
        address: router,
        abi: dexRouterLiquidityAbi,
        functionName,
        args: [token, amountToken, 0n, 0n, to, deadline],
        account,
        value: amountNative,
      });
      return functionName;
    } catch (e) {
      lastError = e;
    }
  }
  const detail = lastError instanceof Error ? lastError.message : lastError ? String(lastError) : "unknown error";
  throw new Error(
    `DEX router does not support native OPN liquidity (${detail}). Check NEXT_PUBLIC_DEX_ROUTER_ADDRESS.`
  );
}

export async function simulateAddLiquidity(params: {
  client: PublicClient;
  router: Address;
  account: Address;
  token: Address;
  pair: LiquidityPair;
  amountToken: bigint;
  amountPair: bigint;
  deadline: bigint;
}) {
  const { client, router, account, token, pair, amountToken, amountPair, deadline } = params;

  if (pair.isNative) {
    const functionName = await resolveNativeAddLiquidityFn(
      client,
      router,
      account,
      token,
      amountToken,
      amountPair,
      account,
      deadline
    );
    return {
      functionName,
      args: [token, amountToken, 0n, 0n, account, deadline] as const,
      value: amountPair,
    };
  }

  if (!pair.address) {
    throw new Error("Pair token address is not configured");
  }

  await client.simulateContract({
    address: router,
    abi: dexRouterLiquidityAbi,
    functionName: "addLiquidity",
    args: [token, pair.address, amountToken, amountPair, 0n, 0n, account, deadline],
    account,
  });

  return {
    functionName: "addLiquidity" as const,
    args: [token, pair.address, amountToken, amountPair, 0n, 0n, account, deadline] as const,
    value: 0n,
  };
}
