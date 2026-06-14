"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { Loader2, Pencil } from "lucide-react";
import { CreatorAvatar } from "@/components/tokens/token-card-hero";
import { useUserProfile } from "@/hooks/useUserProfile";
import { dispatchProfileUpdated } from "@/lib/profile/profile-events";
import { saveProfileImage, uploadProfileAvatar } from "@/lib/profile/avatar-upload";
import { cn, shortenAddress } from "@/lib/utils";
import { formatCreatorDisplay } from "@/lib/username";

export function DashboardProfileLink({ className }: { className?: string }) {
  const { address } = useAccount();
  const { profile, setProfileLocal } = useUserProfile(address);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!address) return null;

  const displayName = formatCreatorDisplay(profile?.username, address, shortenAddress);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !address) return;

    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadProfileAvatar(file);
      const saved = await saveProfileImage(address, url);
      const next = {
        username: saved.username ?? profile?.username ?? null,
        profileImageUrl: saved.profileImageUrl,
      };
      setProfileLocal(next);
      dispatchProfileUpdated(next);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function openAvatarPicker() {
    if (uploading) return;
    avatarInputRef.current?.click();
  }

  return (
    <div className={cn("flex flex-col items-center gap-1.5 text-center", className)}>
      <button
        type="button"
        onClick={openAvatarPicker}
        disabled={uploading}
        className="group relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full ring-2 ring-border transition-colors hover:ring-primary/40 disabled:opacity-70"
        title="Change profile photo"
        aria-label="Change profile photo"
      >
        <CreatorAvatar
          key={profile?.profileImageUrl ?? "fallback"}
          username={profile?.username}
          address={address}
          imageUrl={profile?.profileImageUrl}
          className="h-14 w-14 text-base ring-0"
        />
        <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-background bg-primary text-primary-foreground shadow-sm">
          {uploading ? (
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          ) : (
            <Pencil className="h-3 w-3" aria-hidden />
          )}
        </span>
      </button>
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => void handleAvatarChange(e)}
      />
      <Link
        href="/profile"
        className="max-w-[7rem] truncate text-xs font-medium text-foreground transition-opacity hover:opacity-80"
        title="Edit profile"
      >
        {displayName}
      </Link>
      {uploadError && (
        <p className="max-w-[10rem] text-[10px] leading-tight text-red-600">{uploadError}</p>
      )}
    </div>
  );
}
