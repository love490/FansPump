"use client";

import { useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target } from "lucide-react";

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

export function CreatorQuestSection({
  creatorWallet,
  quests,
  onRefresh,
}: {
  creatorWallet: string;
  quests: Quest[];
  onRefresh?: () => void;
}) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [completing, setCompleting] = useState<string | null>(null);

  async function completeQuest(questId: string) {
    if (!address) return;
    setCompleting(questId);
    try {
      const prefix = process.env.NEXT_PUBLIC_CREATOR_ACTION_MESSAGE_PREFIX ?? "FansPump Creator Action";
      const message = `${prefix}\nComplete quest: ${questId}\nWallet: ${address.toLowerCase()}\nTime: ${Date.now()}`;
      const signature = await signMessageAsync({ message });
      const res = await fetch(`/api/quests/${questId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, message, signature }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to complete quest");
      }
      onRefresh?.();
    } catch (e) {
      console.error(e);
    } finally {
      setCompleting(null);
    }
  }

  if (quests.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
        <Target className="h-5 w-5" /> Community Quests
      </h2>
      <div className="space-y-3">
        {quests.map((q) => (
          <Card key={q.id}>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">{q.title}</CardTitle>
                <Badge variant="secondary">{q.questType}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{q.description}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>+{q.rewardXp} XP</span>
                <span>+{q.rewardReputation} Reputation</span>
                <span>{q.completions} completed</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {q.targetUrl && (
                  <Button asChild variant="outline" size="sm">
                    <a href={q.targetUrl} target="_blank" rel="noopener noreferrer">
                      Open link
                    </a>
                  </Button>
                )}
                {address && address.toLowerCase() !== creatorWallet && (
                  <Button
                    size="sm"
                    disabled={completing === q.id}
                    onClick={() => void completeQuest(q.id)}
                  >
                    {completing === q.id ? "Confirming..." : "Mark complete"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
