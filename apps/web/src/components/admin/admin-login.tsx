"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdmin } from "@/components/admin/admin-context";
import { Shield, Lock, Mail } from "lucide-react";
import Link from "next/link";

export function AdminLogin() {
  const {
    authorized,
    requires2FA,
    sessionChecking,
    loading,
    error,
    login,
    verify2FA,
    clearError,
  } = useAdmin();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"credentials" | "2fa">("credentials");

  useEffect(() => {
    if (!sessionChecking && authorized) {
      const next = searchParams.get("next") ?? "/admin/dashboard";
      router.replace(next);
    }
  }, [authorized, sessionChecking, router, searchParams]);

  useEffect(() => {
    if (requires2FA) setStep("2fa");
  }, [requires2FA]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    const result = await login(email, password);
    if (result === "2fa") setStep("2fa");
  }

  async function handle2FA(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    await verify2FA(code);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md border-primary/20 shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">FansPump Admin</CardTitle>
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            Email &amp; password sign-in
          </p>
          <CardDescription>
            {step === "2fa"
              ? "Enter the 6-digit code from your authenticator app."
              : "Sign in with your platform administrator credentials."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "credentials" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="admin-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    placeholder="admin@fanspump.app"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="admin-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              {error && (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading || sessionChecking}>
                {loading ? "Signing in..." : "Continue"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handle2FA} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-2fa">Authentication code</Label>
                <Input
                  id="admin-2fa"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  maxLength={16}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="000000"
                  className="text-center text-lg tracking-widest"
                />
              </div>
              {error && (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Verifying..." : "Verify & sign in"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep("credentials");
                  setCode("");
                  clearError();
                }}
              >
                Back to login
              </Button>
            </form>
          )}

          <p className="text-center text-xs text-muted-foreground">
            Admin access is separate from wallet login.{" "}
            <Link href="/" className="text-primary hover:underline">
              Return to site
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
