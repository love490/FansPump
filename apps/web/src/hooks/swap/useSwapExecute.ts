"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount, usePublicClient, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { encodeFunctionData } from "viem";
import { buildSwapTransaction, type SwapQuoteResult } from "@/lib/swap/routerAdapter";
import { formatContractError } from "@/lib/contract-errors";
import type { SwapMode } from "@/lib/swap/constants";
import { opnChain } from "@/lib/wagmi";

export type SwapTxStatus = "idle" | "pending" | "confirming" | "success" | "failed";

export function useSwapExecute() {
  const { address } = useAccount();
  const client = usePublicClient({ chainId: opnChain.id });
  const [status, setStatus] = useState<SwapTxStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const { isLoading: confirming, isSuccess, isError } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess && hash) {
      setStatus("success");
      setSubmitted(false);
    }
    if (isError && hash) {
      setStatus("failed");
      setError("Transaction failed on-chain");
      setSubmitted(false);
    }
  }, [isSuccess, isError, hash]);

  const executeSwap = useCallback(
    async (quote: SwapQuoteResult, mode: SwapMode, slippage: number) => {
      if (!address) throw new Error("Connect your wallet");
      if (submitted || isPending) throw new Error("Transaction already in progress");

      setSubmitted(true);
      setStatus("pending");
      setError(null);

      try {
        const tx = buildSwapTransaction({ quote, recipient: address, slippagePercent: slippage, mode });
        await writeContractAsync({
          address: tx.address,
          abi: tx.abi,
          functionName: tx.functionName,
          args: [...tx.args],
          value: tx.value,
        });
        setStatus("confirming");
      } catch (e) {
        setStatus("failed");
        setError(formatContractError(e instanceof Error ? e.message : "Swap failed"));
        setSubmitted(false);
        throw e;
      }
    },
    [address, submitted, isPending, writeContractAsync]
  );

  const estimateGas = useCallback(
    async (quote: SwapQuoteResult, mode: SwapMode, slippage: number) => {
      if (!address || !client) return null;
      try {
        const tx = buildSwapTransaction({ quote, recipient: address, slippagePercent: slippage, mode });
        return await client.estimateGas({
          account: address,
          to: tx.address,
          data: encodeFunctionData({
            abi: tx.abi,
            functionName: tx.functionName,
            args: [...tx.args],
          }),
          value: tx.value,
        });
      } catch {
        return null;
      }
    },
    [address, client]
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setSubmitted(false);
  }, []);

  return {
    executeSwap,
    estimateGas,
    status: confirming ? "confirming" : status,
    error,
    hash,
    reset,
    isBusy: isPending || confirming || submitted,
  };
}
