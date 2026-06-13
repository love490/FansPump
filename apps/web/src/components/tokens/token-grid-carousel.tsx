"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TokenPreviewCard } from "@/components/tokens/token-preview-card";
import type { TokenCardData } from "@/components/tokens/token-card";
import {
  tokenCardGridClass,
  tokenCardMobilePeekClass,
  tokenCardMobileScrollClass,
  tokenCardSkeletonClass,
} from "@/components/tokens/token-card-styles";
import { cn } from "@/lib/utils";

/** Cards per page on tablet+ viewports. */
export function useResponsiveMaxColumns(_preset: "trending" | "grid" = "grid") {
  const [maxCols, setMaxCols] = useState(3);

  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      if (w >= 1440) setMaxCols(5);
      else if (w >= 1024) setMaxCols(4);
      else if (w >= 768) setMaxCols(2);
      else if (w >= 640) setMaxCols(2);
      else setMaxCols(1);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return maxCols;
}

/** @deprecated Use useResponsiveMaxColumns */
export function useResponsivePerPage(preset: "trending" | "grid") {
  return useResponsiveMaxColumns(preset);
}

export function gridColumnCount(visibleCount: number, maxCols: number) {
  return Math.max(1, Math.min(visibleCount, maxCols));
}

export function responsiveGridStyle(colCount: number): React.CSSProperties {
  return {
    gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
  };
}

export function TokenGridCarousel({
  id,
  title,
  description,
  icon,
  tokens,
  isLoading,
  viewAllHref,
  variant = "grid",
  fetchLimit = 24,
  emptyMessage = "No tokens in this section yet.",
}: {
  id?: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  tokens: TokenCardData[];
  isLoading: boolean;
  viewAllHref?: string;
  variant?: "trending" | "grid";
  fetchLimit?: number;
  emptyMessage?: string;
}) {
  const maxCols = useResponsiveMaxColumns(variant);
  const perPage = maxCols;
  const [page, setPage] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const maxPage = Math.max(0, Math.ceil(tokens.length / perPage) - 1);
  const safePage = Math.min(page, maxPage);
  const visible = isMobile ? tokens : tokens.slice(safePage * perPage, safePage * perPage + perPage);
  const colCount = gridColumnCount(visible.length || maxCols, maxCols);
  const skeletonCount = Math.min(maxCols, 4);

  useEffect(() => {
    function update() {
      setIsMobile(window.innerWidth < 768);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    setPage(0);
  }, [tokens.length, perPage]);

  useEffect(() => {
    setPage((p) => Math.min(p, maxPage));
  }, [maxPage]);

  function scrollByCard(direction: -1 | 1) {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-token-card]");
    const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.66;
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  }

  function prev() {
    if (isMobile) scrollByCard(-1);
    else setPage((p) => Math.max(0, p - 1));
  }

  function next() {
    if (isMobile) scrollByCard(1);
    else setPage((p) => Math.min(maxPage, p + 1));
  }

  const showPager = !isMobile && tokens.length > perPage;

  return (
    <section id={id} className="w-full min-w-0 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-lg font-semibold sm:text-xl">
            {icon}
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9"
            disabled={isLoading || (!isMobile && safePage <= 0) || tokens.length <= 1}
            onClick={prev}
            aria-label={`Previous ${title}`}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9"
            disabled={isLoading || (!isMobile && safePage >= maxPage) || tokens.length <= 1}
            onClick={next}
            aria-label={`Next ${title}`}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {viewAllHref && (
            <Button asChild variant="ghost" size="sm" className="ml-1 hidden sm:inline-flex">
              <Link href={viewAllHref}>
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className={cn(isMobile ? tokenCardMobileScrollClass : tokenCardGridClass)}>
          {[...Array(skeletonCount)].map((_, i) => (
            <div key={i} className={tokenCardSkeletonClass()} />
          ))}
        </div>
      ) : tokens.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <div
          ref={scrollRef}
          className={cn(
            isMobile ? tokenCardMobileScrollClass : tokenCardGridClass,
            !isMobile && "items-stretch"
          )}
          style={!isMobile ? responsiveGridStyle(colCount) : undefined}
        >
          {visible.map((t, i) => (
            <div
              key={t.id}
              data-token-card
              className={cn("h-full min-h-0", isMobile && tokenCardMobilePeekClass)}
            >
              <TokenPreviewCard token={t} index={i} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
