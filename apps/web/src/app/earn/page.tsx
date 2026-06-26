"use client";

import { apiUrl } from "@/lib/api";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount, useSignMessage } from "wagmi";
import { BOUNTY_TABS, type BountyListItem, type BountyTab } from "@/lib/bounties";
import { BountyCard } from "@/components/bounties/bounty-card";
import { SignInModal } from "@/components/auth/sign-in-modal";
import { Button } from "@/components/ui/button";
import { CircleDollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRequireSignIn } from "@/hooks/useRequireSignIn";

export default function EarnPage() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { signInOpen, setSignInOpen, withSignIn } = useRequireSignIn();
  const [tab, setTab] = useState<BountyTab>("newest");
  const [bounties, setBounties] = useState<BountyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setJoinError(null);
    fetch(apiUrl(`/api/bounties?tab=${tab}&limit=40`))
      .then((r) => r.json())
      .then((d) => setBounties(d.bounties ?? []))
      .catch(() => setBounties([]))
      .finally(() => setLoading(false));
  }, [tab]);

  async function joinBounty(bountyId: string) {
    withSignIn(async () => {
      if (!address) return;
      setJoiningId(bountyId);
      setJoinError(null);
      try {
        const prefix = process.env.NEXT_PUBLIC_CREATOR_ACTION_MESSAGE_PREFIX ?? "FansPump Creator Action";
        const message = `${prefix}\nJoin bounty: ${bountyId}\nWallet: ${address.toLowerCase()}\nTime: ${Date.now()}`;
        const signature = await signMessageAsync({ message });
        const res = await fetch(apiUrl(`/api/bounties/${bountyId}/join`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: address, message, signature }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to join bounty");
        setBounties((prev) =>
          prev.map((b) =>
            b.id === bountyId
              ? {
                  ...b,
                  participantCount: b.participantCount + 1,
                  spotsLeft:
                    b.maxParticipants != null ? Math.max(0, (b.spotsLeft ?? 0) - 1) : null,
                  isFull:
                    b.maxParticipants != null && b.participantCount + 1 >= b.maxParticipants,
                }
              : b
          )
        );
      } catch (e) {
        setJoinError(e instanceof Error ? e.message : "Failed to join bounty");
      } finally {
        setJoiningId(null);
      }
    });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <CircleDollarSign className="h-7 w-7 text-primary" /> Earn
        </h1>
        <p className="mt-1 text-muted-foreground">
          Complete quests from creators and earn rewards — social, on-chain, and community tasks.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {BOUNTY_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
              tab === t.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-muted hover:bg-muted/80"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {joinError && <p className="mb-4 text-sm text-red-600">{joinError}</p>}

      {loading ? (
        <p className="text-muted-foreground">Loading bounties…</p>
      ) : bounties.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <p className="text-muted-foreground">No bounties in this section yet.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/discover?section=all">Discover</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {bounties.map((bounty) => (
            <BountyCard
              key={bounty.id}
              bounty={bounty}
              joining={joiningId === bounty.id}
              onJoin={joinBounty}
            />
          ))}
        </div>
      )}
      <SignInModal open={signInOpen} onOpenChange={setSignInOpen} />
    </div>
  );
}
