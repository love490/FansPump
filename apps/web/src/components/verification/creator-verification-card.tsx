"use client";

import { apiUrl } from "@/lib/api";

import { useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ShieldCheck } from "lucide-react";

export function CreatorVerificationCard() {
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
      const res = await fetch(apiUrl("/api/verify"), {
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4" />
          Verify
        </CardTitle>
        <CardDescription>
          Sign with your deployer wallet to receive a verified creator badge. No gas fees.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {verified ? (
          <p className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-5 w-5 shrink-0" /> You are a verified IOPn creator
          </p>
        ) : (
          <Button type="button" onClick={() => void verify()} disabled={!isConnected || loading}>
            {loading ? "Signing…" : "Sign & verify"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
