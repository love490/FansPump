"use client";

import Link from "next/link";
import { CreatorAvatar } from "@/components/tokens/token-card-hero";
import { creatorProfilePath, formatCreatorDisplay } from "@/lib/username";
import { cn, shortenAddress } from "@/lib/utils";

type CreatorProfileLinkProps = {
  walletAddress: string;
  username?: string | null;
  profileImageUrl?: string | null;
  className?: string;
  labelClassName?: string;
  showAvatar?: boolean;
  avatarClassName?: string;
  onClick?: () => void;
};

export function CreatorProfileLink({
  walletAddress,
  username,
  profileImageUrl,
  className,
  labelClassName,
  showAvatar = true,
  avatarClassName,
  onClick,
}: CreatorProfileLinkProps) {
  const label = formatCreatorDisplay(username, walletAddress, shortenAddress);

  return (
    <Link
      href={creatorProfilePath(walletAddress)}
      onClick={onClick}
      className={cn(
        "inline-flex min-w-0 max-w-full items-center gap-2 transition-colors hover:text-primary",
        className
      )}
      title={label}
    >
      {showAvatar && (
        <CreatorAvatar
          username={username}
          address={walletAddress}
          imageUrl={profileImageUrl}
          className={avatarClassName}
        />
      )}
      <span
        className={cn(
          "truncate",
          username?.trim() ? "font-medium" : "font-mono text-sm",
          labelClassName
        )}
      >
        {label}
      </span>
    </Link>
  );
}
