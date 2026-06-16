"use client";

import { useMemo } from "react";
import { useAccount } from "wagmi";
import { useAuth } from "@/components/auth/auth-provider";

/** Resolved wallet for dashboard / portfolio — connected wallet or linked auth wallet. */
export function useActiveWallet() {
  const { address, isConnected } = useAccount();
  const { account, isSignedIn } = useAuth();

  const walletAddress = useMemo(() => {
    if (address) return address.toLowerCase() as `0x${string}`;
    if (account?.walletAddress) return account.walletAddress.toLowerCase() as `0x${string}`;
    return undefined;
  }, [address, account?.walletAddress]);

  return {
    walletAddress,
    hasWallet: Boolean(walletAddress),
    isWalletConnected: isConnected && Boolean(address),
    isSignedIn,
    linkedWalletOnly: Boolean(walletAddress) && !isConnected,
  };
}
