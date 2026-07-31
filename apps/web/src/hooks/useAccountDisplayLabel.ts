"use client";

import type { Address } from "viem";
import { useAccount, useBalance } from "wagmi";
import { useAuth } from "@/components/auth/auth-provider";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useActiveWallet } from "@/hooks/useActiveWallet";
import { formatCompactOpn } from "@/lib/dashboard/wallet-balance";
import { formatCreatorDisplay } from "@/lib/username";
import { shortenAddress } from "@/lib/utils";

function isWalletAddress(value: string | null | undefined): boolean {
  return !!value && /^0x[a-fA-F0-9]{40}$/i.test(value.trim());
}

function formatNativeOpnAmount(value: number | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return formatCompactOpn(value);
}

/** Header/sidebar account label — uses a single native OPN balance read, not full portfolio scan. */
export function useAccountDisplayLabel(options?: { preferBalance?: boolean }) {
  const preferBalance = options?.preferBalance ?? false;
  const { address, isConnected } = useAccount();
  const { walletAddress, isSignedIn } = useActiveWallet();
  const { account } = useAuth();
  const resolvedWallet = walletAddress ?? address;
  const { profile } = useUserProfile(resolvedWallet);
  const { data: nativeBalance, isLoading: nativeBalanceLoading } = useBalance({
    address: preferBalance && resolvedWallet ? (resolvedWallet as Address) : undefined,
  });

  const username = profile?.username?.trim() || null;
  const socialName =
    username ||
    (account?.displayName && !isWalletAddress(account.displayName) ? account.displayName : null) ||
    (isSignedIn && account?.email ? account.email.split("@")[0] : null);

  const walletLabel =
    resolvedWallet ? formatCreatorDisplay(profile?.username, resolvedWallet, shortenAddress) : null;

  const identityLabel = socialName || walletLabel || (isSignedIn || isConnected ? "Account" : "Sign in");

  const nativeOpnAmount =
    nativeBalance && nativeBalance.value > 0n ? Number(nativeBalance.formatted) : 0;

  const opnBalanceLabel =
    preferBalance && !nativeBalanceLoading ? formatNativeOpnAmount(nativeOpnAmount) : null;

  const balanceSummary = preferBalance && opnBalanceLabel ? opnBalanceLabel : null;

  const primaryLabel =
    preferBalance && opnBalanceLabel
      ? opnBalanceLabel
      : socialName || walletLabel || identityLabel;

  return {
    primaryLabel,
    identityLabel,
    socialName,
    balanceSummary,
    usdBalanceLabel: null,
    opnBalanceLabel,
    walletLabel,
    balanceLabel: opnBalanceLabel,
    walletAddress: resolvedWallet,
    isConnected: isConnected && Boolean(address),
    isSignedIn,
    balanceLoading: nativeBalanceLoading,
    account,
    profile,
    avatarUrl: account?.avatarUrl ?? profile?.profileImageUrl ?? null,
  };
}
