"use client";

import { useCallback, useState } from "react";
import { useAccount } from "wagmi";
import { useAuth } from "@/components/auth/auth-provider";

/** Gate participate actions (stake, join quest) behind sign-in + connected wallet. */
export function useRequireSignIn() {
  const { isSignedIn } = useAuth();
  const { isConnected, address } = useAccount();
  const [signInOpen, setSignInOpen] = useState(false);

  const isAuthenticated = isSignedIn || isConnected;
  const canParticipate = isAuthenticated && Boolean(address);

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
    signInOpen,
    setSignInOpen,
    requestSignIn,
    withSignIn,
  };
}
