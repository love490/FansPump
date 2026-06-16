"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { apiFetch, apiUrl } from "@/lib/api";

export type AppAccount = {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  walletAddress: string | null;
};

type AuthContextValue = {
  account: AppAccount | null;
  isSignedIn: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  linkWallet: (walletAddress: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<AppAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { address, isConnected } = useAccount();

  const refresh = useCallback(async () => {
    try {
      const res = await apiFetch("/api/auth/me");
      const data = (await res.json()) as { signedIn?: boolean; account?: AppAccount };
      setAccount(data.signedIn && data.account ? data.account : null);
    } catch {
      setAccount(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    setAccount(null);
  }, []);

  const linkWallet = useCallback(
    async (walletAddress: string) => {
      const res = await apiFetch("/api/auth/link-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Failed to link wallet");
      }
      const data = (await res.json()) as { account: AppAccount };
      setAccount(data.account);
    },
    []
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("signed_in") === "1" || params.get("auth_error")) {
      void refresh();
      const url = new URL(window.location.href);
      url.searchParams.delete("signed_in");
      url.searchParams.delete("auth_error");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, [refresh]);

  useEffect(() => {
    if (!account || !isConnected || !address) return;
    if (account.walletAddress?.toLowerCase() === address.toLowerCase()) return;

    void linkWallet(address).catch(() => undefined);
  }, [account, address, isConnected, linkWallet]);

  const value = useMemo(
    () => ({
      account,
      isSignedIn: Boolean(account),
      isLoading,
      refresh,
      signOut,
      linkWallet,
    }),
    [account, isLoading, refresh, signOut, linkWallet]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function oauthSignInUrl(provider: "google" | "github" | "twitter" | "apple") {
  return apiUrl(`/api/auth/oauth/${provider}`);
}
