"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SignInModal } from "@/components/auth/sign-in-modal";
import { useAuth, oauthLinkUrl } from "@/components/auth/auth-provider";
import { useActiveWallet } from "@/hooks/useActiveWallet";
import { apiFetch } from "@/lib/api";
import { SocialConnect } from "@/components/verification/SocialConnect";
import { cn } from "@/lib/utils";

type LinkedRow = {
  id: string;
  label: string;
  description?: string;
  connected: boolean;
  connectedLabel?: string;
  action?: React.ReactNode;
};

const OAUTH_ROWS: {
  id: "google" | "github" | "twitter" | "discord";
  label: string;
  providerKey: string;
}[] = [
  { id: "google", label: "Gmail", providerKey: "google" },
  { id: "github", label: "GitHub", providerKey: "github" },
  { id: "twitter", label: "X (Twitter)", providerKey: "twitter" },
  { id: "discord", label: "Discord", providerKey: "discord" },
];

export function LinkedAccountsSection() {
  const { isSignedIn, account, refresh } = useAuth();
  const { walletAddress } = useActiveWallet();
  const [modalOpen, setModalOpen] = useState(false);
  const [telegram, setTelegram] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linked, setLinked] = useState<{
    identities: { provider: string; label: string }[];
    oauth: Record<string, boolean>;
    walletSocial?: {
      x?: { connected: boolean; username?: string };
      discord?: { connected: boolean; username?: string };
    };
  } | null>(null);

  const load = useCallback(async () => {
    if (!isSignedIn) {
      setLinked(null);
      return;
    }
    const res = await apiFetch("/api/auth/linked-accounts");
    if (!res.ok) return;
    const data = await res.json();
    setLinked(data);
    const tg = data.identities?.find((i: { provider: string }) => i.provider === "telegram");
    if (tg?.label) setTelegram(String(tg.label).replace(/^@/, ""));
  }, [isSignedIn]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("linked") === "1") {
      setMessage("Account linked successfully.");
      void refresh();
      void load();
    }
  }, [load, refresh]);

  async function saveTelegram() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await apiFetch("/api/auth/link-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: telegram.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to link Telegram");
      setMessage("Telegram username saved.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to link Telegram");
    } finally {
      setLoading(false);
    }
  }

  function identityFor(provider: string) {
    return linked?.identities.find((i) => i.provider === provider);
  }

  const rows: LinkedRow[] = [];

  rows.push({
    id: "email",
    label: "Email",
    connected: Boolean(account?.email || identityFor("email")),
    connectedLabel: account?.email ?? identityFor("email")?.label,
    action: !isSignedIn ? (
      <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>
        Sign in
      </Button>
    ) : account?.email ? (
      <Badge variant="secondary">Linked</Badge>
    ) : (
      <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>
        Verify email
      </Button>
    ),
  });

  for (const row of OAUTH_ROWS) {
    const identity = identityFor(row.providerKey);
    const configured = linked?.oauth?.[row.providerKey] ?? false;
    rows.push({
      id: row.id,
      label: row.label,
      connected: Boolean(identity),
      connectedLabel: identity?.label,
      action: !isSignedIn ? (
        <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>
          Sign in first
        </Button>
      ) : identity ? (
        <Badge variant="secondary">Linked</Badge>
      ) : (
        <Button
          size="sm"
          variant="outline"
          disabled={!configured}
          onClick={() => {
            window.location.href = oauthLinkUrl(row.id);
          }}
        >
          {configured ? "Link" : "Not configured"}
        </Button>
      ),
    });
  }

  rows.push({
    id: "telegram",
    label: "Telegram",
    connected: Boolean(identityFor("telegram")),
    connectedLabel: identityFor("telegram")?.label,
    description: "Save your @username for quest verification.",
  });

  return (
    <Card id="linked-accounts" className="scroll-mt-24">
      <CardHeader>
        <CardTitle className="text-base">Linked accounts</CardTitle>
        <CardDescription>
          Connect email, social accounts, and wallets used across FansPump and Earn quests.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isSignedIn && (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Sign in to link Gmail, GitHub, X, Discord, Telegram, and email to your profile.
            <div className="mt-3">
              <Button size="sm" onClick={() => setModalOpen(true)}>
                Sign in
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3",
                row.connected ? "bg-muted/20" : "bg-card"
              )}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{row.label}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {row.connected && row.connectedLabel
                    ? row.connectedLabel
                    : row.description ?? "Not linked"}
                </p>
              </div>
              {row.id === "telegram" && isSignedIn ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    className="h-9 w-36 text-xs"
                    placeholder="@username"
                    value={telegram}
                    onChange={(e) => setTelegram(e.target.value)}
                  />
                  <Button size="sm" variant="outline" disabled={loading} onClick={() => void saveTelegram()}>
                    Save
                  </Button>
                </div>
              ) : (
                row.action
              )}
            </div>
          ))}
        </div>

        {walletAddress && (
          <div className="rounded-lg border p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Wallet quest verification
            </p>
            <SocialConnect walletAddress={walletAddress} />
            <p className="mt-2 text-xs text-muted-foreground">
              X and Discord connections above are used for on-chain quest verification on your wallet.
            </p>
          </div>
        )}

        {message && <p className="text-sm text-emerald-600">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>

      <SignInModal open={modalOpen} onOpenChange={setModalOpen} />
    </Card>
  );
}
