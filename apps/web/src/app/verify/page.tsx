"use client";

import { useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export default function VerifyPage() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  async function verify() {
    if (!address) return;
    setLoading(true);
    const prefix = process.env.NEXT_PUBLIC_VERIFICATION_PREFIX ?? "FansPump Creator Verification";
    const message = `${prefix}\nWallet: ${address}\nTimestamp: ${Date.now()}`;

    try {
      const signature = await signMessageAsync({ message });
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, signature, message }),
      });
      if (res.ok) setVerified(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-2">Creator Verification</h1>
      <p className="text-muted-foreground mb-8">
        Connect your deployer wallet and sign a message to receive a verified creator badge.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Verify your wallet</CardTitle>
          <CardDescription>
            Sign-only verification. No gas fees beyond your wallet signature request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {verified ? (
            <p className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" /> You are a verified IOPn creator
            </p>
          ) : (
            <Button onClick={verify} disabled={!isConnected || loading}>
              {loading ? "Signing..." : "Sign & verify"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
