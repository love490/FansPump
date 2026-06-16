"use client";

import { useState } from "react";
import Image from "next/image";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Mail, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiFetch, apiUrl } from "@/lib/api";
import { oauthSignInUrl, useAuth } from "@/components/auth/auth-provider";
import { cn } from "@/lib/utils";

type OAuthProvider = "google" | "github" | "twitter" | "apple";

const SOCIAL_PROVIDERS: {
  id: OAuthProvider;
  label: string;
  icon: React.ReactNode;
  className: string;
}[] = [
  {
    id: "google",
    label: "Gmail",
    className: "bg-white text-gray-900 border border-border hover:bg-gray-50",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <path
          fill="#EA4335"
          d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.6-5.6-5.8S8.9 5.8 12 5.8c1.8 0 3 .8 3.7 1.5l2.5-2.4C16.9 3.4 14.6 2.5 12 2.5 6.9 2.5 2.7 6.7 2.7 11.8S6.9 21.1 12 21.1c6.9 0 8.6-4.8 8.6-7.3 0-.5 0-.9-.1-1.2H12z"
        />
      </svg>
    ),
  },
  {
    id: "github",
    label: "GitHub",
    className: "bg-[#24292f] text-white hover:bg-[#1b1f24]",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
        <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2.1c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1.1-.8.1-.8.1-.8 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.5-2.7 5.5-5.3 5.8.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A10.9 10.9 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
      </svg>
    ),
  },
  {
    id: "twitter",
    label: "X",
    className: "bg-black text-white hover:bg-neutral-900",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    id: "apple",
    label: "Apple",
    className: "bg-black text-white hover:bg-neutral-900",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
        <path d="M16.365 1.43c0 1.14-.46 2.21-1.24 3.02-.83.86-2.18 1.52-3.28 1.43-.14-1.09.48-2.24 1.24-3.02.83-.83 2.28-1.5 3.28-1.43zm2.9 15.57c-.57 1.31-.85 1.9-1.58 3.06-1.02 1.58-2.46 3.55-4.24 3.56-1.59.01-2-.98-4.16-.98-2.16 0-2.62.99-4.21 1-1.79.01-3.15-1.64-4.17-3.22-2.87-4.43-3.17-9.63-1.4-12.39 1.26-2.02 3.25-3.21 5.5-3.24 1.72-.03 3.34 1.16 4.16 1.16.82 0 2.67-1.43 4.5-1.22.77.03 2.93.31 4.32 2.34-.11.07-2.58 1.51-2.55 4.5.03 3.58 3.13 4.77 3.17 4.79-.03.08-.5 1.72-1.64 3.54z" />
      </svg>
    ),
  },
];

function Divider({ label }: { label: string }) {
  return (
    <div className="relative py-1">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-background px-2 text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

export function SignInModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { openConnectModal } = useConnectModal();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  async function handleOAuth(provider: OAuthProvider) {
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/auth/providers`), { credentials: "include" });
      const data = (await res.json()) as { oauth?: Record<string, boolean> };
      if (!data.oauth?.[provider]) {
        setError(`${SOCIAL_PROVIDERS.find((p) => p.id === provider)?.label} sign-in is not configured yet`);
        return;
      }
      window.location.href = oauthSignInUrl(provider);
    } catch {
      window.location.href = oauthSignInUrl(provider);
    }
  }

  async function sendEmailCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDevCode(null);
    try {
      const res = await apiFetch("/api/auth/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { error?: string; devCode?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to send code");
      if (data.devCode) setDevCode(data.devCode);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  }

  async function verifyEmailCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/auth/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Invalid code");
      await refresh();
      onOpenChange(false);
      setStep("email");
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  function handleConnectWallet() {
    onOpenChange(false);
    openConnectModal?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Sign in</DialogTitle>
          <DialogDescription>
            Sign in with email or social accounts. Connect a wallet to swap, create tokens, and use on-chain features.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          {SOCIAL_PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              type="button"
              onClick={() => void handleOAuth(provider.id)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                provider.className
              )}
            >
              {provider.icon}
              {provider.label}
            </button>
          ))}
        </div>

        <Divider label="or continue with email" />

        {step === "email" ? (
          <form onSubmit={sendEmailCode} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="signin-email">Email</Label>
              <Input
                id="signin-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              <Mail className="h-4 w-4" />
              {loading ? "Sending…" : "Continue with email"}
            </Button>
          </form>
        ) : (
          <form onSubmit={verifyEmailCode} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="signin-code">Verification code</Label>
              <Input
                id="signin-code"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                placeholder="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
              />
              {devCode && (
                <p className="text-xs text-amber-600">Dev code: {devCode}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
              {loading ? "Verifying…" : "Verify & sign in"}
            </Button>
            <button
              type="button"
              className="w-full text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
              }}
            >
              Use a different email
            </button>
          </form>
        )}

        <Divider label="or" />

        <Button variant="outline" className="w-full gap-2" onClick={handleConnectWallet}>
          <Wallet className="h-4 w-4" />
          Connect wallet
        </Button>

        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          Wallet connection is required for swaps, token creation, staking, and other blockchain actions.
        </p>

        {error && <p className="text-center text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
