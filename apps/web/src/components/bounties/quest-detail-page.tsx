"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount, useSignMessage } from "wagmi";
import { apiUrl } from "@/lib/api";
import {
  formatBountyReward,
  formatBountyParticipantCount,
  participationStatusLabel,
  timeRemaining,
  type BountyListItem,
  type BountyParticipationView,
} from "@/lib/bounties";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreatorProfileLink } from "@/components/profile/creator-profile-link";
import { BountyTaskBadges } from "@/components/bounties/bounty-task-badges";
import { QuestStepRunner } from "@/components/bounties/quest-step-runner";
import { hasOnchainBonusReward, resolveQuestSteps, totalQuestXp } from "@/lib/bounty-step-progress";
import { SignInModal } from "@/components/auth/sign-in-modal";
import { useRequireSignIn } from "@/hooks/useRequireSignIn";
import { Calendar, Clock, Gift, Users, ArrowLeft } from "lucide-react";

export function QuestDetailPage({ questId }: { questId: string }) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { canParticipate, signInOpen, setSignInOpen, withSignIn } = useRequireSignIn();
  const [bounty, setBounty] = useState<BountyListItem | null>(null);
  const [participation, setParticipation] = useState<BountyParticipationView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [txHash, setTxHash] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const walletQuery = address ? `?wallet=${address.toLowerCase()}` : "";
      const res = await fetch(apiUrl(`/api/bounties/${questId}${walletQuery}`));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load quest");
      setBounty(data.bounty);
      setParticipation(data.myParticipation ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load quest");
    } finally {
      setLoading(false);
    }
  }, [questId, address]);

  useEffect(() => {
    void load();
  }, [load]);

  async function signAction(action: string) {
    if (!address) throw new Error("Connect your wallet first");
    const prefix = process.env.NEXT_PUBLIC_CREATOR_ACTION_MESSAGE_PREFIX ?? "FansPump Creator Action";
    const message = `${prefix}\n${action}\nWallet: ${address.toLowerCase()}\nTime: ${Date.now()}`;
    const signature = await signMessageAsync({ message });
    return { walletAddress: address, message, signature };
  }

  async function handleJoin() {
    withSignIn(async () => {
      setBusy("join");
      setError(null);
      try {
        const auth = await signAction(`Join quest: ${questId}`);
        const res = await fetch(apiUrl(`/api/bounties/${questId}/join`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(auth),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to join");
        setParticipation(data.participation);
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to join");
      } finally {
        setBusy(null);
      }
    });
  }

  async function handleSubmit() {
    setBusy("submit");
    setError(null);
    try {
      const auth = await signAction(`Submit quest: ${questId}`);
      const res = await fetch(apiUrl(`/api/bounties/${questId}/submit`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...auth,
          proof: {
            proofUrl: proofUrl || undefined,
            note: proofNote || undefined,
            txHash: txHash || undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed");
      setParticipation(data.participation);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleClaim() {
    setBusy("claim");
    setError(null);
    try {
      const auth = await signAction(`Claim quest: ${questId}`);
      const res = await fetch(apiUrl(`/api/bounties/${questId}/claim`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(auth),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Claim failed");
      setParticipation(data.participation);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Claim failed");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return <p className="py-12 text-center text-muted-foreground">Loading quest…</p>;
  }

  if (!bounty) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">{error ?? "Quest not found"}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/earn">Back to Earn</Link>
        </Button>
      </div>
    );
  }

  const reward = formatBountyReward(bounty);
  const remaining = timeRemaining(bounty.endsAt);
  const status = participation?.status;
  const isOnchain = bounty.verificationMethod === "ONCHAIN";
  const config = bounty.verificationConfig as { requirementType?: string } | null;
  const onchainBonus = hasOnchainBonusReward(bounty.rewardType, bounty.rewardAmount);
  const questSteps = useMemo(
    () =>
      resolveQuestSteps({
        taskType: bounty.taskType,
        verificationMethod: bounty.verificationMethod,
        verificationConfig: bounty.verificationConfig,
        xpReward: bounty.xpReward ?? 0,
      }),
    [bounty]
  );
  const xpTotal = totalQuestXp(questSteps);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/earn">
          <ArrowLeft className="mr-1 h-4 w-4" /> Earn
        </Link>
      </Button>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-xl sm:text-2xl">{bounty.title}</CardTitle>
              <div className="mt-2 flex flex-wrap gap-2">
                <BountyTaskBadges bounty={bounty} />
                {bounty.isFeatured && <Badge>Featured</Badge>}
                {bounty.tokenSymbol && <Badge variant="secondary">${bounty.tokenSymbol}</Badge>}
                <Badge variant="secondary">{bounty.verificationMethod}</Badge>
              </div>
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-right">
              <p className="flex items-center justify-end gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                <Gift className="h-3 w-3" /> Earn
              </p>
              <p className="text-lg font-bold text-primary">{xpTotal} XP</p>
              {onchainBonus && (
                <p className="mt-1 text-xs text-muted-foreground">+ {reward} on-chain bonus</p>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">{bounty.description}</p>

          {participation && address && participation.status !== "REJECTED" && (
            <QuestStepRunner
              bounty={bounty}
              questId={questId}
              participation={participation}
              walletAddress={address}
              signAction={signAction}
              onUpdate={setParticipation}
              onRefresh={() => void load()}
              onError={setError}
            />
          )}

          {bounty.requirements && (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              <p className="font-medium">Requirements</p>
              <p className="mt-1 text-muted-foreground">{bounty.requirements}</p>
            </div>
          )}

          {isOnchain && config?.requirementType && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
              <p className="font-medium">On-chain verification</p>
              <p className="mt-1 text-muted-foreground">
                Complete: <span className="font-semibold text-foreground">{config.requirementType.replace(/_/g, " ")}</span>
                {config.requirementType === "SWAP" && " — paste your swap tx hash below"}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <CreatorProfileLink
              walletAddress={bounty.creatorWallet}
              username={bounty.creatorUsername}
              profileImageUrl={bounty.creatorProfileImageUrl}
            />
            <span className="inline-flex items-center gap-1">
              <Users className="h-4 w-4" />
              {formatBountyParticipantCount(bounty.participantCount, bounty.maxParticipants, "participants")}
            </span>
            {bounty.endsAt && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Ends {new Date(bounty.endsAt).toLocaleDateString()}
              </span>
            )}
            {remaining && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {remaining}
              </span>
            )}
          </div>

          {participation && (
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium">Your status</p>
              <p className="mt-1 text-sm text-primary">{participationStatusLabel(participation.status)}</p>
              {participation.rejectionReason && (
                <p className="mt-2 text-sm text-red-600">{participation.rejectionReason}</p>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="space-y-4 border-t pt-4">
            {!participation && bounty.effectiveStatus === "active" && !bounty.isFull && (
              canParticipate ? (
                <Button disabled={busy === "join"} onClick={() => void handleJoin()}>
                  {busy === "join" ? "Joining…" : "Join quest"}
                </Button>
              ) : (
                <Button type="button" onClick={() => setSignInOpen(true)}>
                  Sign in to join quest
                </Button>
              )
            )}

            {participation?.status === "VERIFIED" && onchainBonus && !participation.claimedAt && (
              <div className="space-y-3">
                {config?.requirementType === "SWAP" && (
                  <div className="space-y-2">
                    <Label htmlFor="tx-hash">Swap transaction hash</Label>
                    <Input
                      id="tx-hash"
                      value={txHash}
                      onChange={(e) => setTxHash(e.target.value)}
                      placeholder="0x…"
                    />
                  </div>
                )}
                <Button disabled={busy === "submit"} onClick={() => void handleSubmit()}>
                  {busy === "submit" ? "Verifying…" : "Verify on-chain bonus eligibility"}
                </Button>
                <Button disabled={busy === "claim"} onClick={() => void handleClaim()}>
                  {busy === "claim" ? "Claiming…" : `Claim on-chain bonus (${reward})`}
                </Button>
              </div>
            )}

            {participation?.status === "CLAIMED" && onchainBonus && (
              <p className="text-sm font-medium text-emerald-600">
                On-chain bonus claimed. Connect your wallet if the creator distributes manually.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      <SignInModal open={signInOpen} onOpenChange={setSignInOpen} />
    </div>
  );
}
