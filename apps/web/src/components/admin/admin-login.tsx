"use client";

import { useEffect } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/components/admin/admin-context";
import { Shield } from "lucide-react";

export function AdminLogin() {
  const { isConnected } = useAccount();
  const { isAdmin, authorized, sessionChecking, loading, error, signIn, clearError } = useAdmin();
  const router = useRouter();

  useEffect(() => {
    if (!sessionChecking && authorized) {
      router.replace("/admin/dashboard");
    }
  }, [authorized, sessionChecking, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> FansPump Admin
          </CardTitle>
          <CardDescription>
            Connect your admin wallet and sign a message to access the platform dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <ConnectButton />
          </div>
          {isConnected && !isAdmin && (
            <p className="text-center text-sm text-destructive">
              This wallet is not in the admin allowlist.
            </p>
          )}
          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
              {error}
            </p>
          )}
          {isConnected && isAdmin && (
            <Button
              className="w-full"
              onClick={() => {
                clearError();
                void signIn();
              }}
              disabled={loading || sessionChecking}
            >
              {loading ? "Signing..." : sessionChecking ? "Checking session..." : "Sign in as admin"}
            </Button>
          )}
          <p className="text-center text-xs text-muted-foreground">
            Admin access is URL-only — not shown in the public navigation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
