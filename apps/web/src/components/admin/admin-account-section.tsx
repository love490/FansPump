"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAdmin } from "@/components/admin/admin-context";
import { adminFetch } from "@/lib/admin-session";
import { Shield, KeyRound } from "lucide-react";

export function AdminAccountSection() {
  const { email, twoFactorEnabled, refresh } = useAdmin();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changeCode, setChangeCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [enableCode, setEnableCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function start2FASetup() {
    setBusy(true);
    setError(null);
    setMessage(null);
    setBackupCodes(null);
    try {
      const res = await adminFetch("/api/admin/auth/2fa/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Setup failed");
      setSetupSecret(data.secret);
      setQrDataUrl(data.qrDataUrl);
      setMessage("Scan the QR code with Google Authenticator, Authy, or Microsoft Authenticator.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Setup failed");
    } finally {
      setBusy(false);
    }
  }

  async function enable2FA() {
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/auth/2fa/enable", {
        method: "POST",
        body: JSON.stringify({ code: enableCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Enable failed");
      setBackupCodes(data.backupCodes ?? []);
      setSetupSecret(null);
      setQrDataUrl(null);
      setEnableCode("");
      setMessage("Two-factor authentication enabled.");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enable failed");
    } finally {
      setBusy(false);
    }
  }

  async function disable2FA() {
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/auth/2fa/disable", {
        method: "POST",
        body: JSON.stringify({ password: disablePassword, code: disableCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Disable failed");
      setDisablePassword("");
      setDisableCode("");
      setMessage("Two-factor authentication disabled.");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Disable failed");
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword,
          newPassword,
          code: changeCode || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Password change failed");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setChangeCode("");
      setMessage(data.message ?? "Password updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Password change failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Account & Security</h2>
        <p className="text-sm text-muted-foreground">
          Manage your admin password and two-factor authentication.
        </p>
      </div>

      {message && (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" /> Signed in as
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{email}</span>
          <Badge variant={twoFactorEnabled ? "default" : "secondary"}>
            {twoFactorEnabled ? "2FA enabled" : "2FA disabled"}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="h-5 w-5" /> Two-factor authentication
          </CardTitle>
          <CardDescription>
            TOTP codes from Google Authenticator, Authy, or Microsoft Authenticator.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!twoFactorEnabled ? (
            <>
              {!setupSecret ? (
                <Button onClick={() => void start2FASetup()} disabled={busy}>
                  Set up 2FA
                </Button>
              ) : (
                <div className="space-y-4">
                  {qrDataUrl && (
                    <div className="flex justify-center rounded-lg border bg-white p-4">
                      <Image src={qrDataUrl} alt="2FA QR code" width={200} height={200} unoptimized />
                    </div>
                  )}
                  <p className="break-all font-mono text-xs text-muted-foreground">Secret: {setupSecret}</p>
                  <div className="flex max-w-xs gap-2">
                    <Input
                      value={enableCode}
                      onChange={(e) => setEnableCode(e.target.value)}
                      placeholder="6-digit code"
                      inputMode="numeric"
                    />
                    <Button onClick={() => void enable2FA()} disabled={busy}>
                      Enable
                    </Button>
                  </div>
                </div>
              )}
              {backupCodes && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                  <p className="mb-2 text-sm font-semibold">Backup recovery codes — save these now:</p>
                  <div className="grid grid-cols-2 gap-1 font-mono text-sm">
                    {backupCodes.map((c) => (
                      <span key={c}>{c}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="grid max-w-md gap-3">
              <Input
                type="password"
                placeholder="Current password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
              />
              <Input
                placeholder="Authenticator code"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
              />
              <Button variant="destructive" onClick={() => void disable2FA()} disabled={busy}>
                Disable 2FA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>Minimum 8 characters with upper, lower, and number.</CardDescription>
        </CardHeader>
        <CardContent className="grid max-w-md gap-3">
          <Input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {twoFactorEnabled && (
            <Input
              placeholder="2FA code (required)"
              value={changeCode}
              onChange={(e) => setChangeCode(e.target.value)}
            />
          )}
          <Button onClick={() => void changePassword()} disabled={busy}>
            Update password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
