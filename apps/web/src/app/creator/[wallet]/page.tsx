"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { TokenCard, type TokenCardData } from "@/components/tokens/token-card";
import { tokenCardGridClass } from "@/components/tokens/token-card-styles";
import { VerifiedCreatorBadge } from "@/components/creator/verified-creator-badge";
import { SecurityBadges } from "@/components/v2/security-badges";
import { CreatorQuestSection } from "@/components/v2/creator-quest-section";
import { CreatorBountySection } from "@/components/bounties/creator-bounty-section";
import type { SecurityBadge } from "@/lib/v2/badges";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FollowCreatorButton } from "@/components/profile/follow-creator-button";
import { formatCreatorDisplay } from "@/lib/username";
import { shortenAddress } from "@/lib/utils";
import { ANNOUNCEMENT_TYPE_LABELS, type AnnouncementTypeId } from "@iopn/shared";
import { CheckCircle2, Coins, BarChart3, Layers, Users } from "lucide-react";

type CreatorProfile = {
  walletAddress: string;
  username: string | null;
  walletVerified: boolean;
  verifiedAt: string | null;
  tokensCreated: number;
  totalVolume: number;
  totalTrades: number;
  creatorEarningsWei: string;
  announcementCount: number;
  followers: number;
  following: number;
  tokens: TokenCardData[];
  creatorStatus?: string;
  joinedAt?: string | null;
  reputationScore?: number;
  fansPumpXp?: number;
  totalViews?: number;
  avgTrustScore?: number;
  liquidityAdded?: number;
  badges?: SecurityBadge[];
  questsCompleted?: number;
};

type Quest = {
  id: string;
  title: string;
  description: string;
  questType: string;
  targetUrl?: string | null;
  rewardXp: number;
  rewardReputation: number;
  completions: number;
};

type Announcement = {
  id: string;
  title: string;
  content: string;
  type: AnnouncementTypeId;
  createdAt: string;
  tokenAddress: string;
};

export default function CreatorProfilePage() {
  const params = useParams();
  const wallet = (params.wallet as string)?.toLowerCase();
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [error, setError] = useState<string | null>(null);

  function loadProfile() {
    if (!wallet) return;
    Promise.all([
      fetch(`/api/creator/${wallet}`).then((r) => r.json()),
      fetch(`/api/announcements?creatorWallet=${wallet}&limit=10`).then((r) => r.json()),
      fetch(`/api/quests?creator=${wallet}`).then((r) => r.json()),
    ])
      .then(([profileData, annData, questData]) => {
        if (profileData.error) throw new Error(profileData.error);
        setProfile(profileData.profile);
        setAnnouncements(annData.announcements ?? []);
        setQuests(questData.quests ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load profile"));
  }

  useEffect(() => {
    loadProfile();
  }, [wallet]);

  if (error) {
    return <div className="mx-auto max-w-4xl px-4 py-20 text-center text-red-600">{error}</div>;
  }

  if (!profile) {
    return <div className="mx-auto max-w-4xl px-4 py-20 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">
            {formatCreatorDisplay(profile.username, profile.walletAddress, shortenAddress)}
          </h1>
          {profile.walletVerified && <VerifiedCreatorBadge />}
          <FollowCreatorButton creatorWallet={profile.walletAddress} />
        </div>
        {profile.username && (
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            {shortenAddress(profile.walletAddress, 6)}
          </p>
        )}
        {profile.verifiedAt && (
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
            Verified {new Date(profile.verifiedAt).toLocaleDateString()}
          </p>
        )}
        {profile.badges && profile.badges.length > 0 && (
          <SecurityBadges badges={profile.badges} size="md" className="mt-3" max={6} />
        )}
        {profile.creatorStatus && (
          <Badge variant="outline" className="mt-2 capitalize">
            {profile.creatorStatus.toLowerCase()} Creator
          </Badge>
        )}
      </header>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Followers</p>
            <p className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5" /> {profile.followers}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Tokens Created</p>
            <p className="text-2xl font-bold flex items-center gap-2">
              <Layers className="h-5 w-5" /> {profile.tokensCreated}
            </p>
          </CardContent>
        </Card>
        {profile.reputationScore != null && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Reputation</p>
              <p className="text-2xl font-bold">{profile.reputationScore}</p>
            </CardContent>
          </Card>
        )}
        {profile.avgTrustScore != null && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Avg Trust Score</p>
              <p className="text-2xl font-bold">{profile.avgTrustScore}/100</p>
            </CardContent>
          </Card>
        )}
        {profile.liquidityAdded != null && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Liquidity Added</p>
              <p className="text-2xl font-bold">{profile.liquidityAdded.toFixed(2)}</p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total Volume</p>
            <p className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-5 w-5" /> {profile.totalVolume.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total Trades</p>
            <p className="text-2xl font-bold">{profile.totalTrades}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Creator Earnings</p>
            <p className="text-2xl font-bold flex items-center gap-2">
              <Coins className="h-5 w-5" /> {profile.creatorEarningsWei}
            </p>
          </CardContent>
        </Card>
      </div>

      <CreatorBountySection
        creatorWallet={wallet}
        creatorTokens={profile.tokens.map((t) => ({
          contractAddress: t.contractAddress,
          symbol: t.symbol,
          name: t.name,
        }))}
        onRefresh={loadProfile}
      />

      <CreatorQuestSection
        creatorWallet={wallet}
        quests={quests}
        onRefresh={loadProfile}
      />

      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">Tokens</h2>
        {profile.tokens.length === 0 ? (
          <p className="text-muted-foreground">No tokens created yet.</p>
        ) : (
          <div className={`${tokenCardGridClass} items-stretch`}>
            {profile.tokens.map((t, i) => (
              <div key={t.id} className="h-full">
                <TokenCard token={t} index={i} />
              </div>
            ))}
          </div>
        )}
      </section>

      {announcements.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold">Recent Announcements</h2>
          <div className="space-y-3">
            {announcements.map((a) => (
              <Card key={a.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">{a.title}</CardTitle>
                    <Badge variant="secondary">{ANNOUNCEMENT_TYPE_LABELS[a.type]}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <Link href={`/token/${a.tokenAddress}`} className="hover:underline">
                      View token
                    </Link>
                    {" · "}
                    {new Date(a.createdAt).toLocaleString()}
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
