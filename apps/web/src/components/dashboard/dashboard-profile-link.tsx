"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { Pencil } from "lucide-react";
import { CreatorAvatar } from "@/components/tokens/token-card-hero";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useActiveWallet } from "@/hooks/useActiveWallet";
import { cn, shortenAddress } from "@/lib/utils";
import { formatCreatorDisplay } from "@/lib/username";

export function DashboardProfileLink({ className }: { className?: string }) {
  const { walletAddress } = useActiveWallet();
  const { address } = useAccount();
  const resolved = walletAddress ?? address;
  const { profile } = useUserProfile(resolved);

  if (!resolved) return null;

  const displayName = formatCreatorDisplay(profile?.username, resolved, shortenAddress);

  return (
    <div className={cn("flex flex-col items-center gap-1.5 text-center", className)}>
      <Link
        href="/profile"
        className="group relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full ring-2 ring-border transition-colors hover:ring-primary/40"
        title="Edit profile"
        aria-label="Edit profile"
      >
        <CreatorAvatar
          key={profile?.profileImageUrl ?? "fallback"}
          username={profile?.username}
          address={resolved}
          imageUrl={profile?.profileImageUrl}
          className="h-14 w-14 text-base ring-0"
        />
        <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-background bg-primary text-primary-foreground shadow-sm">
          <Pencil className="h-3 w-3" aria-hidden />
        </span>
      </Link>
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
