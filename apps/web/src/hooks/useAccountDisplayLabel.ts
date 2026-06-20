"use client";

import { useAccount, useBalance } from "wagmi";
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

function formatNativeOpnAmount(value: number | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (value >= 1) return `${value.toLocaleString(undefined, { maximumFractionDigits: 4 })} OPN`;
  if (value >= 0.0001) return `${value.toLocaleString(undefined, { maximumFractionDigits: 6 })} OPN`;
  if (value > 0) return `${value.toExponential(2)} OPN`;
  return "0 OPN";
}

export function useAccountDisplayLabel(options?: { preferBalance?: boolean }) {
  const preferBalance = options?.preferBalance ?? false;
  const { address, isConnected } = useAccount();
  const { walletAddress, isSignedIn } = useActiveWallet();
  const { account } = useAuth();
  const resolvedWallet = walletAddress ?? address;
  const { profile } = useUserProfile(resolvedWallet);
  const { totals, loading: balanceLoading } = useWalletPortfolioBalance();
  const { data: nativeBalance, isLoading: nativeBalanceLoading } = useBalance({
    address: isConnected && address ? address : undefined,
  });

  const username = profile?.username?.trim() || null;
  const socialName =
    username ||
    (account?.displayName && !isWalletAddress(account.displayName) ? account.displayName : null) ||
    (isSignedIn && account?.email ? account.email.split("@")[0] : null);

  const walletLabel =
    resolvedWallet ? formatCreatorDisplay(profile?.username, resolvedWallet, shortenAddress) : null;

  const identityLabel = socialName || walletLabel || (isSignedIn || isConnected ? "Account" : "Sign in");

  const usdBalanceLabel = balanceLoading ? null : formatBalanceTotal(totals.usd, "USD");

  const nativeOpnAmount =
    isConnected && nativeBalance
      ? Number(nativeBalance.formatted)
      : totals.opn > 0
        ? totals.opn
        : null;

  const opnBalanceLabel =
    preferBalance && !nativeBalanceLoading
      ? formatNativeOpnAmount(nativeOpnAmount ?? 0)
      : null;

  const balanceSummary =
    preferBalance && !balanceLoading && opnBalanceLabel ? opnBalanceLabel : null;

  const primaryLabel =
    preferBalance && opnBalanceLabel
      ? opnBalanceLabel
      : socialName || walletLabel || identityLabel;

  return {
    primaryLabel,
    identityLabel,
    socialName,
    balanceSummary,
    usdBalanceLabel,
    opnBalanceLabel,
    walletLabel,
    balanceLabel: usdBalanceLabel,
    walletAddress: resolvedWallet,
    isConnected: isConnected && Boolean(address),
    isSignedIn,
    balanceLoading: balanceLoading || nativeBalanceLoading,
    account,
    profile,
    avatarUrl: account?.avatarUrl ?? profile?.profileImageUrl ?? null,
  };
}
