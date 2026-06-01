"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { maxUint256, type Address } from "viem";
import { erc20Abi } from "@/lib/swap/abis";
import { getRouterAddress } from "@/lib/swap/routerAdapter";

export function useSwapApproval(tokenAddress: Address | undefined, owner: Address | undefined) {
  const router = getRouterAddress("primary");

  const { data: allowance, refetch } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: owner && router ? [owner, router] : undefined,
    query: {
      enabled:
        !!tokenAddress &&
        !!owner &&
        router !== "0x0000000000000000000000000000000000000000",
    },
  });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function approve() {
    if (!tokenAddress) return;
    writeContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [router, maxUint256],
    });
  }

  return {
    allowance: allowance ?? 0n,
    approve,
    isPending: isPending || confirming,
    isSuccess,
    refetch,
    hash,
  };
}
