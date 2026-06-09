"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TokenPreviewCard } from "@/components/tokens/token-preview-card";
import type { TokenCardData } from "@/components/tokens/token-card";
import { cn } from "@/lib/utils";

export function useResponsivePerPage(preset: "trending" | "grid") {
  const [perPage, setPerPage] = useState(preset === "trending" ? 1 : 2);

  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      if (preset === "trending") {
        if (w >= 1024) setPerPage(3);
        else if (w >= 640) setPerPage(2);
        else setPerPage(1);
      } else {
        if (w >= 1280) setPerPage(8);
        else if (w >= 1024) setPerPage(6);
        else if (w >= 768) setPerPage(3);
        else if (w >= 480) setPerPage(2);
        else setPerPage(1);
      }
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [preset]);

  return perPage;
}

export function gridColsClass(perPage: number, variant: "trending" | "grid") {
  if (variant === "trending") {
    if (perPage >= 3) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
    if (perPage >= 2) return "grid-cols-1 sm:grid-cols-2";
    return "grid-cols-1";
  }
  if (perPage >= 8) return "grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
  if (perPage >= 6) return "grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-3";
  if (perPage >= 3) return "grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3";
  if (perPage >= 2) return "grid-cols-1 min-[480px]:grid-cols-2";
  return "grid-cols-1";
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
  const perPage = useResponsivePerPage(variant);
  const [page, setPage] = useState(0);
  const maxPage = Math.max(0, Math.ceil(tokens.length / perPage) - 1);
  const safePage = Math.min(page, maxPage);
  const visible = tokens.slice(safePage * perPage, safePage * perPage + perPage);

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
    <section id={id} className="w-full space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
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
        <div className={cn("grid gap-3", gridColsClass(perPage, variant))}>
          {[...Array(Math.min(perPage, 4))].map((_, i) => (
            <div key={i} className="h-[88px] animate-pulse rounded-xl bg-muted sm:h-[96px]" />
          ))}
        </div>
      ) : tokens.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <>
          <div className={cn("grid gap-3", gridColsClass(perPage, variant))}>
            {visible.map((t, i) => (
              <TokenPreviewCard key={t.id} token={t} index={i} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
