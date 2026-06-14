"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreatorProfileLink } from "@/components/profile/creator-profile-link";
import { formatBountyReward, type BountyListItem } from "@/lib/bounties";
import { Calendar, Users, Gift } from "lucide-react";

function statusBadge(status: BountyListItem["effectiveStatus"]) {
  switch (status) {
    case "active":
      return <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15">Active</Badge>;
    case "completed":
      return <Badge variant="secondary">Completed</Badge>;
    case "ended":
      return <Badge variant="outline">Ended</Badge>;
  }
}

export function BountyCard({
  bounty,
  joining,
  onJoin,
  showJoin = true,
}: {
  bounty: BountyListItem;
  joining?: boolean;
  onJoin?: (bountyId: string) => void;
  showJoin?: boolean;
}) {
  const reward = formatBountyReward(bounty);
  const canJoin =
    showJoin &&
    bounty.effectiveStatus === "active" &&
    !bounty.isFull &&
    onJoin;

  return (
    <Card>
      <CardHeader className="space-y-3 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base leading-snug sm:text-lg">{bounty.title}</CardTitle>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {statusBadge(bounty.effectiveStatus)}
              <Badge variant="outline">{bounty.taskType}</Badge>
              {bounty.tokenSymbol && (
                <Badge variant="secondary">${bounty.tokenSymbol}</Badge>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-right">
            <p className="flex items-center justify-end gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              <Gift className="h-3 w-3" /> Reward
            </p>
            <p className="text-sm font-bold text-primary">{reward}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="line-clamp-3 text-sm text-muted-foreground">{bounty.description}</p>
        {bounty.requirements && (
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Requirements: </span>
            {bounty.requirements}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <CreatorProfileLink
            walletAddress={bounty.creatorWallet}
            username={bounty.creatorUsername}
            profileImageUrl={bounty.creatorProfileImageUrl}
          />
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {bounty.participantCount}/{bounty.maxParticipants} joined
          </span>
          {bounty.endsAt && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Ends {new Date(bounty.endsAt).toLocaleDateString()}
            </span>
          )}
        </div>

        {canJoin && (
          <Button
            size="sm"
            disabled={joining}
            onClick={() => onJoin?.(bounty.id)}
            className={cn(joining && "opacity-70")}
          >
            {joining ? "Joining…" : "Join bounty"}
          </Button>
        )}
        {bounty.isFull && bounty.effectiveStatus === "active" && (
          <p className="text-xs font-medium text-amber-600">All spots filled</p>
        )}
      </CardContent>
    </Card>
  );
}
