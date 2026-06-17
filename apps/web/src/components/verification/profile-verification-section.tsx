"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useActiveWallet } from "@/hooks/useActiveWallet";
import { useVerification } from "@/hooks/useVerification";
import { VerifiedBadge } from "@/components/verification/VerifiedBadge";
import { VerificationModal } from "@/components/verification/VerificationModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

export function ProfileVerificationSection() {
  const { walletAddress, hasWallet } = useActiveWallet();
  const address = walletAddress?.toLowerCase();
  const { level, refresh } = useVerification(address);
  const [modalOpen, setModalOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const isVerified = level === "EMAIL" || level === "FULL";

  useEffect(() => {
    const social = searchParams.get("social");
    const error = searchParams.get("error");
    if (social === "x_connected") {
      setNotice("X account connected.");
      void refresh();
    } else if (social === "discord_connected") {
      setNotice("Discord account connected.");
      void refresh();
    } else if (error === "x_oauth_failed") {
      setNotice("X connection failed. Try again.");
    } else if (error === "discord_oauth_failed") {
      setNotice("Discord connection failed. Try again.");
    }
    if (social || error) {
      router.replace("/profile", { scroll: false });
    }
  }, [searchParams, router, refresh]);

  if (!hasWallet || !address) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" />
            Verification
          </CardTitle>
          <CardDescription>
            Verify your email for a blue ✓ badge. Connect NeoID later for gold ✦.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {notice && <p className="text-sm text-green-600">{notice}</p>}
          {isVerified ? (
            <div className="flex items-center gap-2">
              <VerifiedBadge level={level} size="lg" />
              <Button type="button" variant="ghost" size="sm" onClick={() => setModalOpen(true)}>
                Manage
              </Button>
            </div>
          ) : (
            <Button type="button" onClick={() => setModalOpen(true)}>
              Verify
            </Button>
          )}
        </CardContent>
      </Card>

      <VerificationModal
        walletAddress={address}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
