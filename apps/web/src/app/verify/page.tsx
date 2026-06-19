"use client";

import { CreatorVerificationCard } from "@/components/verification/creator-verification-card";

export default function VerifyPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-2 text-3xl font-bold">Creator Verification</h1>
      <p className="mb-8 text-muted-foreground">
        Connect your deployer wallet and sign a message to receive a verified creator badge.
      </p>
      <CreatorVerificationCard />
    </div>
  );
}
