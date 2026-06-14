"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreatorAvatar } from "@/components/tokens/token-card-hero";
import { Loader2, Settings, Upload } from "lucide-react";
import { shortenAddress } from "@/lib/utils";
import { formatCreatorDisplay } from "@/lib/username";

type ProfileEditorProps = {
  showSettingsLink?: boolean;
};

export function ProfileEditor({ showSettingsLink = true }: ProfileEditorProps) {
  const { address, isConnected } = useAccount();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState("");
  const [savedUsername, setSavedUsername] = useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setUsername("");
      setSavedUsername(null);
      setProfileImageUrl(null);
      return;
    }
    fetch(`/api/user/profile?wallet=${address.toLowerCase()}`)
      .then((r) => r.json())
      .then((data) => {
        const name = data.profile?.username ?? "";
        const image = data.profile?.profileImageUrl ?? null;
        setUsername(name);
        setSavedUsername(name || null);
        setProfileImageUrl(image);
      })
      .catch(() => undefined);
  }, [address]);

  async function saveProfile() {
    if (!address) return;
    setSaving(true);
    setProfileError(null);
    setProfileMessage(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          username,
          profileImageUrl,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        profile?: { username: string | null; profileImageUrl: string | null };
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to save profile");
      setSavedUsername(data.profile?.username ?? null);
      setProfileImageUrl(data.profile?.profileImageUrl ?? null);
      setProfileMessage("Profile saved.");
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadingAvatar(true);
    setProfileError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", "avatar");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = (await res.json()) as { error?: string; url?: string | null };
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      if (!data.url) throw new Error("Image storage is not configured yet.");
      setProfileImageUrl(data.url);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  }

  if (!isConnected || !address) {
    return (
      <p className="text-sm text-muted-foreground">
        Connect your wallet to edit your profile.
      </p>
    );
  }

  const displayName = formatCreatorDisplay(savedUsername, address, shortenAddress);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        {profileImageUrl ? (
          <Image
            src={profileImageUrl}
            alt="Profile"
            width={96}
            height={96}
            className="h-24 w-24 rounded-full object-cover ring-2 ring-border"
          />
        ) : (
          <CreatorAvatar
            username={username || savedUsername}
            address={address}
            className="h-24 w-24 text-lg"
          />
        )}
        <div className="flex-1 space-y-2 text-center sm:text-left">
          <p className="font-mono text-sm text-muted-foreground">{shortenAddress(address, 6)}</p>
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadingAvatar}
              onClick={() => avatarInputRef.current?.click()}
            >
              {uploadingAvatar ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload photo
                </>
              )}
            </Button>
            {profileImageUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={saving}
                onClick={() => setProfileImageUrl(null)}
              >
                Remove photo
              </Button>
            )}
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => void handleAvatarChange(e)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="profile-username">Username</Label>
        <Input
          id="profile-username"
          value={username}
          onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
          placeholder={shortenAddress(address, 4)}
          disabled={saving}
          maxLength={24}
        />
        <p className="text-xs text-muted-foreground">
          Optional. 3–24 characters: letters, numbers, underscore. Shown on token cards as{" "}
          <span className="font-medium text-foreground">{displayName}</span>.
        </p>
      </div>

      {profileError && <p className="text-sm text-red-600">{profileError}</p>}
      {profileMessage && <p className="text-sm text-green-600">{profileMessage}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void saveProfile()} disabled={saving || uploadingAvatar}>
          {saving ? "Saving…" : "Save profile"}
        </Button>
        {showSettingsLink && (
          <Button asChild variant="outline" type="button">
            <Link href="/settings">
              <Settings className="mr-2 h-4 w-4" />
              Account settings
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
