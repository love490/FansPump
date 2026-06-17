"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { CreatorAvatar } from "@/components/tokens/token-card-hero";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useActiveWallet } from "@/hooks/useActiveWallet";
import { useAuth } from "@/components/auth/auth-provider";
import { cn, shortenAddress } from "@/lib/utils";
import { formatCreatorDisplay } from "@/lib/username";

export function DashboardProfileLink({ className }: { className?: string }) {
  const { walletAddress, hasWallet, isSignedIn } = useActiveWallet();
  const { account } = useAuth();
  const { profile } = useUserProfile(walletAddress);

  if (!hasWallet && !isSignedIn) return null;

  const displayName = walletAddress
    ? formatCreatorDisplay(profile?.username, walletAddress, shortenAddress)
    : account?.displayName || account?.email?.split("@")[0] || "Profile";

  const avatarAddress = walletAddress ?? "0x0000000000000000000000000000000000000000";
  const avatarUrl = profile?.profileImageUrl ?? account?.avatarUrl ?? null;

  return (
    <div className={cn("flex flex-col items-center gap-1.5 text-center", className)}>
      <div className="relative h-14 w-14 shrink-0">
        <Link
          href="/profile"
          className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full ring-2 ring-border transition-colors hover:ring-primary/40"
          title="View profile"
          aria-label="View profile"
        >
          <CreatorAvatar
            key={avatarUrl ?? "fallback"}
            username={profile?.username ?? account?.displayName}
            address={avatarAddress}
            imageUrl={avatarUrl}
            className="h-14 w-14 text-base ring-0"
          />
        </Link>
        <Link
          href="/profile"
          className="absolute -bottom-1 -right-1 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105"
          title="Edit profile"
          aria-label="Edit profile"
        >
          <Pencil className="h-3 w-3" aria-hidden />
        </Link>
      </div>
      <Link
        href="/profile"
        className="max-w-[7rem] truncate text-xs font-medium text-foreground transition-opacity hover:opacity-80"
        title="Edit profile"
      >
        {displayName}
      </Link>
    </div>
  );
}
