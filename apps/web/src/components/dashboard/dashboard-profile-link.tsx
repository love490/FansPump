"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAccount } from "wagmi";
import { User } from "lucide-react";
import { CreatorAvatar } from "@/components/tokens/token-card-hero";
import { cn, shortenAddress } from "@/lib/utils";
import { formatCreatorDisplay } from "@/lib/username";

export function DashboardProfileLink({ className }: { className?: string }) {
  const { address } = useAccount();
  const [username, setUsername] = useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setUsername(null);
      setProfileImageUrl(null);
      return;
    }
    fetch(`/api/user/profile?wallet=${address.toLowerCase()}`)
      .then((r) => r.json())
      .then((data) => {
        setUsername(data.profile?.username ?? null);
        setProfileImageUrl(data.profile?.profileImageUrl ?? null);
      })
      .catch(() => undefined);
  }, [address]);

  if (!address) return null;

  const displayName = formatCreatorDisplay(username, address, shortenAddress);

  return (
    <Link
      href="/profile"
      className={cn(
        "group flex flex-col items-center gap-1.5 text-center transition-opacity hover:opacity-90",
        className
      )}
      title="Edit profile"
    >
      <span className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full ring-2 ring-border transition-colors group-hover:ring-primary/40">
        {profileImageUrl ? (
          <Image src={profileImageUrl} alt="" width={56} height={56} className="h-full w-full object-cover" />
        ) : (
          <CreatorAvatar username={username} address={address} className="h-14 w-14 text-base" />
        )}
        <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-background bg-primary text-primary-foreground">
          <User className="h-3 w-3" />
        </span>
      </span>
      <span className="max-w-[7rem] truncate text-xs font-medium text-foreground">{displayName}</span>
    </Link>
  );
}
