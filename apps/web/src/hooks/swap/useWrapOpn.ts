"use client";

import { useCallback, useState } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther, type Address } from "viem";

export type WrapMode = "wrap" | "unwrap";

export type WrapStatus = "idle" | "pending" | "success" | "error";

/** Standard WETH9-style wrap ABI (deposit native OPN, withdraw to OPN). */
const wopnWrapAbi = [
  {
    type: "function",
    name: "deposit",
    inputs: [],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "withdraw",
    inputs: [{ name: "wad", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export function useWrapOpn(wopnAddress: Address) {
  const { address, isConnected } = useAccount();
  const [status, setStatus] = useState<WrapStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const { writeContractAsync, data: hash, reset: resetWrite } = useWriteContract();
  const { isLoading: confirming } = useWaitForTransactionReceipt({ hash });

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    resetWrite();
  }, [resetWrite]);

  const execute = useCallback(
    async (mode: WrapMode, amount: string) => {
      if (!isConnected || !address) {
        setError("Connect your wallet first");
        setStatus("error");
        return;
      }

      const parsed = parseEther(amount);
      if (parsed <= 0n) {
        setError("Enter an amount greater than zero");
        setStatus("error");
        return;
      }

      setError(null);
      setStatus("pending");

      try {
        if (mode === "wrap") {
          await writeContractAsync({
            address: wopnAddress,
            abi: wopnWrapAbi,
            functionName: "deposit",
            value: parsed,
          });
        } else {
          await writeContractAsync({
            address: wopnAddress,
            abi: wopnWrapAbi,
            functionName: "withdraw",
            args: [parsed],
          });
        }
        setStatus("success");
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message
            : "shortMessage" in (e as object) && typeof (e as { shortMessage?: string }).shortMessage === "string"
              ? (e as { shortMessage: string }).shortMessage
              : "Wrap transaction failed";
        setError(msg);
        setStatus("error");
      }
    },
    [address, isConnected, wopnAddress, writeContractAsync]
  );

  const isPending = status === "pending" || confirming;

  return {
    execute,
    status: isPending ? "pending" : status,
    hash,
    error,
    reset,
    isPending,
  };
}
