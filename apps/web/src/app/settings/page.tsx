"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreatorAvatar } from "@/components/tokens/token-card-hero";
import { Shield, ExternalLink, Loader2, Upload } from "lucide-react";
import { shortenAddress } from "@/lib/utils";
import { formatCreatorDisplay } from "@/lib/username";

export default function SettingsPage() {
  const { address, isConnected } = useAccount();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState("");
  const [savedUsername, setSavedUsername] = useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [savedProfileImageUrl, setSavedProfileImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setUsername("");
      setSavedUsername(null);
      setProfileImageUrl(null);
      setSavedProfileImageUrl(null);
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
        setSavedProfileImageUrl(image);
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
      setSavedProfileImageUrl(data.profile?.profileImageUrl ?? null);
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
      if (!data.url) {
        throw new Error("Image storage is not configured yet.");
      }
      setProfileImageUrl(data.url);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  }

  const displayName = address
    ? formatCreatorDisplay(savedUsername, address, shortenAddress)
    : "—";

  return (
    <div className="mx-auto max-w-xl space-y-6 py-2 sm:py-4">
      <header>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-muted-foreground">Account preferences and platform options.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Wallet</CardTitle>
          <CardDescription>
            {isConnected && address
              ? `Connected: ${shortenAddress(address, 6)}`
              : "Connect wallet to have access to your dashboard."}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>
            Set a display name and photo shown on token cards. Leave the name blank to show your wallet address.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {profileImageUrl ? (
              <Image
                src={profileImageUrl}
                alt="Profile"
                width={64}
                height={64}
                className="h-16 w-16 rounded-full object-cover ring-2 ring-border"
              />
            ) : (
              <CreatorAvatar
                username={username || savedUsername}
                address={address}
                className="h-16 w-16 text-sm"
              />
            )}
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!isConnected || uploadingAvatar}
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
                  disabled={!isConnected || saving}
                  onClick={() => setProfileImageUrl(null)}
                >
                  Remove photo
                </Button>
              )}
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
            <Label htmlFor="username">Display name</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
              placeholder={address ? shortenAddress(address, 4) : "your_username"}
              disabled={!isConnected || saving}
              maxLength={24}
            />
            <p className="text-xs text-muted-foreground">
              Optional. 3–24 characters: letters, numbers, underscore.
            </p>
          </div>

          {profileError && <p className="text-sm text-red-600">{profileError}</p>}
          {profileMessage && <p className="text-sm text-green-600">{profileMessage}</p>}
          {!profileMessage && isConnected && (
            <p className="text-sm text-muted-foreground">Shown on cards as: {displayName}</p>
          )}
          <Button
            type="button"
            onClick={() => void saveProfile()}
            disabled={!isConnected || saving || uploadingAvatar}
          >
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Switch between light and dark mode.</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Creator</CardTitle>
          <CardDescription>Verify your deployer wallet for a trusted creator badge.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/verify">
              <Shield className="h-4 w-4" />
              Creator verification
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Legal & docs</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <Link href="/privacy" className="inline-flex items-center gap-1 text-primary hover:underline">
            Privacy Policy <ExternalLink className="h-3 w-3" />
          </Link>
          <Link href="/terms" className="inline-flex items-center gap-1 text-primary hover:underline">
            Terms of Service <ExternalLink className="h-3 w-3" />
          </Link>
          <Link href="/docs" className="inline-flex items-center gap-1 text-primary hover:underline">
            Documentation <ExternalLink className="h-3 w-3" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
