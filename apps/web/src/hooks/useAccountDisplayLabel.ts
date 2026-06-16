"use client";

import { useAccount } from "wagmi";
import { useAuth } from "@/components/auth/auth-provider";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useActiveWallet } from "@/hooks/useActiveWallet";
import { useWalletPortfolioBalance } from "@/hooks/dashboard/useWalletPortfolioBalance";
import { formatBalanceTotal } from "@/lib/dashboard/wallet-balance";
import { formatCreatorDisplay } from "@/lib/username";
import { shortenAddress } from "@/lib/utils";

function isWalletAddress(value: string | null | undefined): boolean {
  return !!value && /^0x[a-fA-F0-9]{40}$/i.test(value.trim());
}

export function useAccountDisplayLabel(options?: { preferBalance?: boolean }) {
  const preferBalance = options?.preferBalance ?? false;
  const { address, isConnected } = useAccount();
  const { walletAddress, isSignedIn } = useActiveWallet();
  const { account } = useAuth();
  const resolvedWallet = walletAddress ?? address;
  const { profile } = useUserProfile(resolvedWallet);
  const { totals, loading: balanceLoading } = useWalletPortfolioBalance();

  const username = profile?.username?.trim() || null;
  const socialName =
    username ||
    (account?.displayName && !isWalletAddress(account.displayName) ? account.displayName : null) ||
    (isSignedIn && account?.email ? account.email.split("@")[0] : null);

  const balanceLabel =
    preferBalance && resolvedWallet
      ? balanceLoading
        ? "…"
        : formatBalanceTotal(totals.usd, "USD")
      : null;

  const walletLabel =
    resolvedWallet ? formatCreatorDisplay(profile?.username, resolvedWallet, shortenAddress) : null;

  const primaryLabel =
    socialName ||
    balanceLabel ||
    walletLabel ||
    (isSignedIn || isConnected ? "Account" : "Sign in");

  return {
    primaryLabel,
    socialName,
    balanceLabel: balanceLoading ? null : formatBalanceTotal(totals.usd, "USD"),
    walletAddress: resolvedWallet,
    isConnected: isConnected && Boolean(address),
    isSignedIn,
    balanceLoading,
    account,
    profile,
    avatarUrl: account?.avatarUrl ?? profile?.profileImageUrl ?? null,
  };
}
