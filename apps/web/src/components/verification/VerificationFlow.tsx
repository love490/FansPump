"use client";

import { useState } from "react";
import { apiUrl } from "@/lib/api";
import { useVerification } from "@/hooks/useVerification";
import { SocialConnect } from "./SocialConnect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Step = "overview" | "email-input" | "email-otp" | "neoid";

type VerificationFlowProps = {
  walletAddress: string;
  onComplete?: () => void;
};

export function VerificationFlow({ walletAddress, onComplete }: VerificationFlowProps) {
  const wallet = walletAddress.toLowerCase();
  const { emailVerified, neoIdVerified, status, refresh } = useVerification(wallet);

  const [step, setStep] = useState<Step>("overview");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendOtp() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/verification/email/send-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: wallet, email }),
      });
      const data = (await res.json()) as { error?: string; devCode?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to send code");
      if (data.devCode) console.info("[dev] OTP:", data.devCode);
      setStep("email-otp");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  }

  async function confirmOtp() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/verification/email/confirm-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: wallet, otp }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Verification failed");
      await refresh();
      setStep("overview");
      onComplete?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function confirmNeoId() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/verification/neoid/confirm"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: wallet }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "NeoID connection failed");
      await refresh();
      setStep("overview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "NeoID connection failed");
    } finally {
      setLoading(false);
    }
  }

  if (step === "overview") {
    return (
      <div className="space-y-3">
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl border p-4",
            emailVerified ? "border-blue-900/50 bg-blue-950/20" : "border-border bg-card"
          )}
        >
          <div
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
              emailVerified ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground"
            )}
          >
            {emailVerified ? "✓" : "1"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Email</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {emailVerified ? `Verified — ${status?.email}` : "Verify to get blue ✓ badge"}
            </p>
          </div>
          {!emailVerified && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 border-blue-900 text-blue-400 hover:border-blue-700 hover:text-blue-300"
              onClick={() => setStep("email-input")}
            >
              Verify
            </Button>
          )}
        </div>

        <div
          className={cn(
            "flex items-center gap-3 rounded-xl border p-4",
            neoIdVerified ? "border-amber-900/50 bg-amber-950/20" : "border-border bg-card"
          )}
        >
          <div
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
              neoIdVerified ? "bg-amber-400 text-amber-950" : "bg-muted text-muted-foreground"
            )}
          >
            {neoIdVerified ? "✦" : "2"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              NeoID <span className="text-xs font-normal text-muted-foreground">optional</span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {neoIdVerified ? "Connected — gold ✦ badge active" : "Upgrade to gold ✦ badge"}
            </p>
          </div>
          {!neoIdVerified && emailVerified && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 border-amber-900 text-amber-400 hover:border-amber-700 hover:text-amber-300"
              onClick={() => setStep("neoid")}
            >
              Connect
            </Button>
          )}
          {!neoIdVerified && !emailVerified && (
            <span className="shrink-0 text-xs text-muted-foreground">After email</span>
          )}
        </div>

        <div className="border-t border-border pt-3">
          <SocialConnect walletAddress={wallet} />
        </div>
      </div>
    );
  }

  if (step === "email-input") {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setStep("overview")}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back
        </button>
        <div>
          <p className="mb-1 font-semibold">Enter your email</p>
          <p className="text-sm text-muted-foreground">We&apos;ll send a 6-digit code.</p>
        </div>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void sendOtp()}
          placeholder="you@example.com"
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="button" onClick={() => void sendOtp()} disabled={!email || loading} className="w-full">
          {loading ? "Sending…" : "Send code"}
        </Button>
      </div>
    );
  }

  if (step === "email-otp") {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setStep("email-input")}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back
        </button>
        <div>
          <p className="mb-1 font-semibold">Check your email</p>
          <p className="text-sm text-muted-foreground">
            Sent to <span className="text-foreground">{email}</span>
          </p>
        </div>
        <Input
          type="text"
          inputMode="numeric"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          className="text-center text-3xl font-bold tracking-[0.5em]"
          maxLength={6}
        />
        {error && <p className="text-center text-xs text-destructive">{error}</p>}
        <Button
          type="button"
          onClick={() => void confirmOtp()}
          disabled={otp.length !== 6 || loading}
          className="w-full"
        >
          {loading ? "Verifying…" : "Confirm"}
        </Button>
        <button
          type="button"
          onClick={() => void sendOtp()}
          className="w-full text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Resend code
        </button>
      </div>
    );
  }

  if (step === "neoid") {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setStep("overview")}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back
        </button>
        <div>
          <p className="mb-1 font-semibold">Connect NeoID</p>
          <p className="text-sm text-muted-foreground">Upgrades your badge from blue ✓ to gold ✦.</p>
        </div>
        <div className="space-y-2 rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
          <p className="text-2xl">🪪</p>
          <p className="text-sm text-muted-foreground">NeoID coming soon on OPN Chain</p>
          <p className="text-xs text-muted-foreground">
            Connect button appears when NeoID launches.
          </p>
        </div>
        {process.env.NODE_ENV === "development" && (
          <Button
            type="button"
            variant="outline"
            onClick={() => void confirmNeoId()}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Connecting…" : "[DEV] Simulate NeoID"}
          </Button>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return null;
}
