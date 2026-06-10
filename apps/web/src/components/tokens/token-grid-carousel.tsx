"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TokenPreviewCard } from "@/components/tokens/token-preview-card";
import type { TokenCardData } from "@/components/tokens/token-card";
import { cn } from "@/lib/utils";

/** Max cards per row/page for the current viewport width. */
export function useResponsiveMaxColumns(preset: "trending" | "grid") {
  const [maxCols, setMaxCols] = useState(1);

  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      if (preset === "trending") {
        if (w >= 1280) setMaxCols(4);
        else if (w >= 768) setMaxCols(3);
        else if (w >= 480) setMaxCols(2);
        else setMaxCols(1);
      } else {
        if (w >= 1536) setMaxCols(8);
        else if (w >= 1280) setMaxCols(6);
        else if (w >= 1024) setMaxCols(4);
        else if (w >= 640) setMaxCols(3);
        else if (w >= 400) setMaxCols(2);
        else setMaxCols(1);
      }
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [preset]);

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
  const maxPage = Math.max(0, Math.ceil(tokens.length / perPage) - 1);
  const safePage = Math.min(page, maxPage);
  const visible = tokens.slice(safePage * perPage, safePage * perPage + perPage);
  const colCount = gridColumnCount(visible.length || maxCols, maxCols);
  const gridStyle = useMemo(() => responsiveGridStyle(colCount), [colCount]);
  const skeletonCount = Math.min(maxCols, 4);

  useEffect(() => {
    setPage(0);
  }, [tokens.length, perPage]);

  useEffect(() => {
    setPage((p) => Math.min(p, maxPage));
  }, [maxPage]);

  function prev() {
    setPage((p) => Math.max(0, p - 1));
  }

  function next() {
    setPage((p) => Math.min(maxPage, p + 1));
  }

  return (
    <section id={id} className="w-full min-w-0 space-y-3">
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
            disabled={isLoading || safePage <= 0 || tokens.length <= perPage}
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
            disabled={isLoading || safePage >= maxPage || tokens.length <= perPage}
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
        <div className="grid w-full min-w-0 gap-3" style={responsiveGridStyle(skeletonCount)}>
          {[...Array(skeletonCount)].map((_, i) => (
            <div key={i} className="h-[88px] min-w-0 animate-pulse rounded-xl bg-muted sm:h-[96px]" />
          ))}
        </div>
      ) : tokens.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <div className={cn("grid w-full min-w-0 gap-3")} style={gridStyle}>
          {visible.map((t, i) => (
            <TokenPreviewCard key={t.id} token={t} index={i} compact={colCount > 2} />
          ))}
        </div>
      )}
    </section>
  );
}
