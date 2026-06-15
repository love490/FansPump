"use client";

import { apiUrl } from "@/lib/api";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type VoteType = "BULLISH" | "NEUTRAL" | "BEARISH";

export function VoteButtons({
  tokenId,
  walletAddress,
  initialVote,
}: {
  tokenId: string;
  walletAddress?: string;
  initialVote?: VoteType | null;
}) {
  const [vote, setVote] = useState<VoteType | null>(initialVote ?? null);
  const [loading, setLoading] = useState(false);

  async function castVote(voteType: VoteType) {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/votes"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId, walletAddress, voteType }),
      });
      if (res.ok) setVote(voteType);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={vote === "BULLISH" ? "default" : "outline"}
        size="sm"
        disabled={!walletAddress || loading}
        onClick={() => castVote("BULLISH")}
        className={cn("min-w-0 flex-1 sm:flex-none", vote === "BULLISH" && "bg-green-600 hover:bg-green-700")}
      >
        <TrendingUp className="h-4 w-4 shrink-0" /> Bullish
      </Button>
      <Button
        variant={vote === "NEUTRAL" ? "default" : "outline"}
        size="sm"
        disabled={!walletAddress || loading}
        onClick={() => castVote("NEUTRAL")}
        className="min-w-0 flex-1 sm:flex-none"
      >
        <Minus className="h-4 w-4 shrink-0" /> Neutral
      </Button>
      <Button
        variant={vote === "BEARISH" ? "default" : "outline"}
        size="sm"
        disabled={!walletAddress || loading}
        onClick={() => castVote("BEARISH")}
        className={cn("min-w-0 flex-1 sm:flex-none", vote === "BEARISH" && "bg-red-600 hover:bg-red-700")}
      >
        <TrendingDown className="h-4 w-4 shrink-0" /> Bearish
      </Button>
    </div>
  );
}
