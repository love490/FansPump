"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, ExternalLink } from "lucide-react";
import { shortenAddress } from "@/lib/utils";

export default function SettingsPage() {
  const { address, isConnected } = useAccount();
  const [username, setUsername] = useState("");
  const [savedUsername, setSavedUsername] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setUsername("");
      setSavedUsername(null);
      return;
    }
    fetch(`/api/user/profile?wallet=${address.toLowerCase()}`)
      .then((r) => r.json())
      .then((data) => {
        const name = data.profile?.username ?? "";
        setUsername(name);
        setSavedUsername(name || null);
      })
      .catch(() => undefined);
  }, [address]);

  async function saveUsername() {
    if (!address) return;
    setSaving(true);
    setProfileError(null);
    setProfileMessage(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, username }),
      });
      const data = (await res.json()) as { error?: string; profile?: { username: string } };
      if (!res.ok) throw new Error(data.error ?? "Failed to save username");
      setSavedUsername(data.profile?.username ?? username);
      setProfileMessage("Profile username saved.");
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : "Failed to save username");
    } finally {
      setSaving(false);
    }
  }

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
          <CardTitle className="text-base">Profile username</CardTitle>
          <CardDescription>
            Shown as creator name on token cards across FansPump. 3–24 characters, letters, numbers, and underscore.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
              placeholder="your_username"
              disabled={!isConnected || saving}
              maxLength={24}
            />
          </div>
          {profileError && <p className="text-sm text-red-600">{profileError}</p>}
          {profileMessage && <p className="text-sm text-green-600">{profileMessage}</p>}
          {savedUsername && !profileMessage && (
            <p className="text-sm text-muted-foreground">Current username: {savedUsername}</p>
          )}
          <Button type="button" onClick={() => void saveUsername()} disabled={!isConnected || saving || !username}>
            {saving ? "Saving…" : "Save username"}
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
