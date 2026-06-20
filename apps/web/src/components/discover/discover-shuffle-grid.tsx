"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { LayoutGroup, motion } from "framer-motion";
import { TokenPreviewCard } from "@/components/tokens/token-preview-card";
import type { TokenCardData } from "@/components/tokens/token-card";
import {
  tokenCardGridClass,
  tokenCardSkeletonClass,
} from "@/components/tokens/token-card-styles";
import { fetchDiscoverTokens, tokenQueryKeys, type DiscoverFilters } from "@/lib/tokens-api";
import { getActiveChainId } from "@/lib/chain-config/opn";
import { cn } from "@/lib/utils";

const ROTATE_MS = 5000;
const TOKEN_LIMIT = 24;

const SORT_SECTIONS = ["trending", "gainer", "views", "new"] as const;

function mergeUniqueTokens(lists: TokenCardData[][]): TokenCardData[] {
  const seen = new Set<string>();
  const merged: TokenCardData[] = [];
  for (const list of lists) {
    for (const token of list) {
      if (seen.has(token.id)) continue;
      seen.add(token.id);
      merged.push(token);
    }
  }
  return merged;
}

function orderBySectionRank(
  tokens: TokenCardData[],
  rankedList: TokenCardData[]
): TokenCardData[] {
  const rank = new Map(rankedList.map((token, index) => [token.id, index]));
  return [...tokens].sort((a, b) => {
    const aRank = rank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const bRank = rank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    return aRank - bRank;
  });
}

export function DiscoverShuffleGrid({ filters }: { filters?: DiscoverFilters }) {
  const chainId = getActiveChainId();
  const [sortIndex, setSortIndex] = useState(0);

  const queries = useQueries({
    queries: SORT_SECTIONS.map((section) => ({
      queryKey: tokenQueryKeys.discover(section, chainId, filters),
      queryFn: () => fetchDiscoverTokens(section, TOKEN_LIMIT, filters),
      staleTime: 15_000,
    })),
  });

  const sectionLists = queries.map((q) => q.data ?? []);
  const isLoading = queries.some((q) => q.isLoading);
  const merged = useMemo(() => mergeUniqueTokens(sectionLists), [sectionLists]);

  const orderedTokens = useMemo(() => {
    const activeList = sectionLists[sortIndex % SORT_SECTIONS.length] ?? [];
    return orderBySectionRank(merged, activeList);
  }, [merged, sectionLists, sortIndex]);

  useEffect(() => {
    if (merged.length <= 1) return;
    const id = window.setInterval(() => {
      setSortIndex((current) => (current + 1) % SORT_SECTIONS.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [merged.length]);

  if (isLoading && merged.length === 0) {
    return (
      <div className={tokenCardGridClass}>
        {[...Array(8)].map((_, i) => (
          <div key={i} className={tokenCardSkeletonClass()} />
        ))}
      </div>
    );
  }

  if (merged.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        No tokens match your filters yet.
      </p>
    );
  }

  return (
    <LayoutGroup>
      <motion.div layout className={cn(tokenCardGridClass, "items-stretch")}>
        {orderedTokens.map((token, index) => (
          <motion.div
            key={token.id}
            layout
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="h-full min-h-0"
          >
            <TokenPreviewCard token={token} index={index < 8 ? index : 0} />
          </motion.div>
        ))}
      </motion.div>
    </LayoutGroup>
  );
}
