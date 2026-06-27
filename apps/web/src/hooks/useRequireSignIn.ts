"use client";

import { useCallback, useState } from "react";
import { useAccount } from "wagmi";
import { useAuth } from "@/components/auth/auth-provider";

/** Gate participate actions (stake, quests) behind sign-in + wallet. */
export function useRequireSignIn() {
  const { account, isSignedIn } = useAuth();
  const { isConnected, address: connectedAddress } = useAccount();
  const [signInOpen, setSignInOpen] = useState(false);

  const walletAddress = connectedAddress ?? account?.walletAddress ?? undefined;
  const isAuthenticated = isSignedIn || isConnected;
  const canParticipate = isAuthenticated && Boolean(walletAddress);

  const requestSignIn = useCallback(() => {
    setSignInOpen(true);
  }, []);

  const withSignIn = useCallback(
    (action: () => void | Promise<void>) => {
      if (!canParticipate) {
        requestSignIn();
        return;
      }
      void action();
    },
    [canParticipate, requestSignIn]
  );

  return {
    isAuthenticated,
    canParticipate,
    walletAddress,
    signInOpen,
    setSignInOpen,
    requestSignIn,
    withSignIn,
  };
}
