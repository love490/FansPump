"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueries } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, Flame, TrendingUp } from "lucide-react";
import { TokenGridCarousel } from "@/components/tokens/token-grid-carousel";
import { fetchDiscoverTokens, tokenQueryKeys } from "@/lib/tokens-api";
import { getActiveChainId } from "@/lib/chain-config/opn";
import { cn } from "@/lib/utils";

const ROTATE_MS = 5000;
const TOKEN_LIMIT = 24;

type SpotlightSection = {
  id: string;
  apiSection: string;
  label: string;
  description: string;
  variant: "trending" | "grid";
  icon: ReactNode;
};

const SPOTLIGHT_SECTIONS: SpotlightSection[] = [
  {
    id: "trending",
    apiSection: "trending",
    label: "Trending",
    description: "Tokens gaining momentum right now.",
    variant: "trending",
    icon: <Flame className="h-6 w-6 text-orange-500" />,
  },
  {
    id: "trading",
    apiSection: "gainer",
    label: "Top Trading",
    description: "Highest 24h volume movers.",
    variant: "grid",
    icon: <TrendingUp className="h-6 w-6 text-emerald-500" />,
  },
  {
    id: "popularity",
    apiSection: "views",
    label: "Most Popular",
    description: "Tokens with the most profile views.",
    variant: "grid",
    icon: <Eye className="h-6 w-6 text-violet-500" />,
  },
];

function shuffleSections<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function DiscoverSpotlightCarousel() {
  const chainId = getActiveChainId();
  const [sections] = useState(() => shuffleSections(SPOTLIGHT_SECTIONS));
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const queries = useQueries({
    queries: sections.map((section) => ({
      queryKey: tokenQueryKeys.discover(section.apiSection, chainId),
      queryFn: () => fetchDiscoverTokens(section.apiSection, TOKEN_LIMIT),
      staleTime: 15_000,
    })),
  });

  const activeSection = sections[activeIndex] ?? sections[0];
  const activeQuery = queries[activeIndex];
  const isLoading = queries.some((q) => q.isLoading);

  useEffect(() => {
    if (paused || sections.length <= 1) return;
    const id = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % sections.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [paused, sections.length]);

  const sectionLabels = useMemo(
    () =>
      sections.map((section, index) => ({
        id: section.id,
        label: section.label,
        index,
      })),
    [sections]
  );

  return (
    <div
      className="space-y-3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        {sectionLabels.map(({ id, label, index }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition-colors sm:text-sm",
              activeIndex === index
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          Rotates every 5s{paused ? " · paused" : ""}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSection?.id ?? "spotlight"}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
        >
          {activeSection && (
            <TokenGridCarousel
              id={`discover-spotlight-${activeSection.id}`}
              title={activeSection.label}
              description={activeSection.description}
              icon={activeSection.icon}
              tokens={activeQuery?.data ?? []}
              isLoading={isLoading && !activeQuery?.data?.length}
              viewAllHref={`/discover?section=${activeSection.apiSection}`}
              variant={activeSection.variant}
              fetchLimit={TOKEN_LIMIT}
              autoAdvanceMs={ROTATE_MS}
              emptyMessage="No tokens in this category yet."
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
