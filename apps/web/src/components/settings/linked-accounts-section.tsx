"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth, oauthLinkUrl, oauthSignInUrl } from "@/components/auth/auth-provider";
import { apiFetch, apiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

type LinkedRow = {
  id: string;
  label: string;
  description?: string;
  connected: boolean;
  connectedLabel?: string;
  action?: React.ReactNode;
};

const SETTINGS_RETURN = "/settings#linked-accounts";

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
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailStep, setEmailStep] = useState<"email" | "code">("email");
  const [emailLoading, setEmailLoading] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [telegram, setTelegram] = useState("");
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [oauthConfigured, setOauthConfigured] = useState<Record<string, boolean>>({});
  const [linked, setLinked] = useState<{
    identities: { provider: string; label: string }[];
    oauth: Record<string, boolean>;
  } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(apiUrl("/api/auth/providers"), { credentials: "include" });
        if (!res.ok) return;
        const data = (await res.json()) as { oauth?: Record<string, boolean> };
        if (data.oauth) setOauthConfigured(data.oauth);
      } catch {
        // ignore — buttons fall back to "Not configured"
      }
    })();
  }, []);

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
    if (account?.email) {
      setEmail(account.email);
    }
  }, [account?.email]);

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
    if (params.get("auth_error")) {
      setError("Could not connect that account. Try again or use a different sign-in method.");
    }
  }, [load, refresh]);

  async function sendEmailCode() {
    const trimmed = email.trim();
    if (!trimmed) return;

    setEmailLoading(true);
    setError(null);
    setMessage(null);
    setDevCode(null);
    try {
      const res = await apiFetch("/api/auth/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = (await res.json()) as { error?: string; devCode?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to send code");
      if (data.devCode) setDevCode(data.devCode);
      setEmailStep("code");
      setMessage("Verification code sent.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send code");
    } finally {
      setEmailLoading(false);
    }
  }

  async function verifyEmailCode() {
    if (emailCode.length !== 6) return;

    setEmailLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await apiFetch("/api/auth/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: emailCode }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Invalid code");
      setEmailStep("email");
      setEmailCode("");
      setDevCode(null);
      setMessage(isSignedIn ? "Email linked successfully." : "Signed in with email.");
      await refresh();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setEmailLoading(false);
    }
  }

  async function saveTelegram() {
    if (!isSignedIn) {
      setError("Sign in first to save your Telegram username.");
      return;
    }

    setTelegramLoading(true);
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
      setTelegramLoading(false);
    }
  }

  function identityFor(provider: string) {
    return linked?.identities.find((i) => i.provider === provider);
  }

  function oauthAction(
    provider: "google" | "github" | "twitter" | "discord",
    providerKey: string,
    linkedIdentity: { provider: string; label: string } | undefined
  ) {
    const configured =
      oauthConfigured[providerKey] ?? linked?.oauth?.[providerKey] ?? false;

    if (linkedIdentity) {
      return <Badge variant="secondary">Linked</Badge>;
    }

    if (!configured) {
      return (
        <Button size="sm" variant="outline" disabled>
          Not configured
        </Button>
      );
    }

    const href = isSignedIn
      ? oauthLinkUrl(provider, { returnTo: SETTINGS_RETURN })
      : oauthSignInUrl(provider, { returnTo: SETTINGS_RETURN });

    return (
      <Button size="sm" variant="outline" asChild>
        <a href={href}>{isSignedIn ? "Link" : "Sign in"}</a>
      </Button>
    );
  }

  const emailLinked = Boolean(account?.email || identityFor("email"));
  const telegramLinked = Boolean(identityFor("telegram"));

  const rows: LinkedRow[] = [];

  rows.push({
    id: "email",
    label: "Email",
    connected: emailLinked,
    connectedLabel: account?.email ?? identityFor("email")?.label,
  });

  for (const row of OAUTH_ROWS) {
    const identity = identityFor(row.providerKey);
    rows.push({
      id: row.id,
      label: row.label,
      connected: Boolean(identity),
      connectedLabel: identity?.label,
      action: oauthAction(row.id, row.providerKey, identity),
    });
  }

  rows.push({
    id: "telegram",
    label: "Telegram",
    connected: telegramLinked,
    connectedLabel: identityFor("telegram")?.label,
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
            Sign in or link accounts below. Social buttons go directly to each provider; enter email
            or Telegram here.
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
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{row.label}</p>
                  {row.connected && <Badge variant="secondary" className="text-[10px]">Linked</Badge>}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {row.connected && row.connectedLabel
                    ? row.connectedLabel
                    : row.description ?? "Not linked"}
                </p>
              </div>

              {row.id === "email" ? (
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[280px]">
                  {emailLinked && emailStep === "email" ? (
                    <Input
                      className="h-9 text-xs"
                      type="email"
                      value={account?.email ?? email}
                      readOnly
                      disabled
                    />
                  ) : emailStep === "email" ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        className="h-9 min-w-[180px] flex-1 text-xs"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={emailLoading || !email.trim()}
                        onClick={() => void sendEmailCode()}
                      >
                        {emailLoading ? "Sending…" : "Send code"}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          className="h-9 w-28 text-xs"
                          inputMode="numeric"
                          pattern="\d{6}"
                          maxLength={6}
                          placeholder="6-digit code"
                          value={emailCode}
                          onChange={(e) =>
                            setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                          }
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={emailLoading || emailCode.length !== 6}
                          onClick={() => void verifyEmailCode()}
                        >
                          {emailLoading ? "Verifying…" : "Verify"}
                        </Button>
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setEmailStep("email");
                            setEmailCode("");
                            setDevCode(null);
                            setError(null);
                          }}
                        >
                          Change email
                        </button>
                      </div>
                      {devCode && (
                        <p className="text-xs text-amber-600">Dev code: {devCode}</p>
                      )}
                    </div>
                  )}
                </div>
              ) : row.id === "telegram" ? (
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                  <Input
                    className="h-9 min-w-[140px] flex-1 text-xs sm:w-36 sm:flex-none"
                    placeholder="@username"
                    value={telegram}
                    onChange={(e) => setTelegram(e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={telegramLoading || !telegram.trim() || !isSignedIn}
                    onClick={() => void saveTelegram()}
                  >
                    {telegramLoading ? "Saving…" : "Save"}
                  </Button>
                </div>
              ) : (
                row.action
              )}
            </div>
          ))}
        </div>

        {message && <p className="text-sm text-emerald-600">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
