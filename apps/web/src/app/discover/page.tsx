"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Settings2 } from "lucide-react";
import { TokenGridCarousel } from "@/components/tokens/token-grid-carousel";
import { cn } from "@/lib/utils";
import { fetchDiscoverTokens, tokenQueryKeys, type DiscoverFilters } from "@/lib/tokens-api";
import { getActiveChainId } from "@/lib/chain-config/opn";
import { TOKEN_CATEGORIES, TOKEN_CATEGORY_LABELS, type TokenCategoryId } from "@iopn/shared";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const sections = [
  {
    id: "latest",
    label: "Latest",
    description: "Most recently added tokens on the platform.",
    variant: "grid" as const,
  },
  {
    id: "trending",
    label: "Trending",
    description: "Tokens with the highest trending score right now.",
    variant: "trending" as const,
  },
  {
    id: "verified",
    label: "Verified",
    description: "Projects from verified creators.",
    variant: "grid" as const,
  },
  {
    id: "new",
    label: "New Token",
    description: "Newly created tokens — sorted by launch date.",
    variant: "grid" as const,
  },
  {
    id: "views",
    label: "Most Viewed",
    description: "Tokens with the most profile views.",
    variant: "grid" as const,
  },
  {
    id: "holders",
    label: "Most Holders",
    description: "Tokens with the largest holder counts.",
    variant: "grid" as const,
  },
  {
    id: "updated",
    label: "Recently Updated",
    description: "Projects updated most recently.",
    variant: "grid" as const,
  },
  {
    id: "featured",
    label: "Featured Projects",
    description: "Hand-picked featured projects.",
    variant: "grid" as const,
  },
] as const;

function sectionFilters(sectionId: string, global: DiscoverFilters): DiscoverFilters {
  if (sectionId === "verified") {
    return { ...global, verified: true };
  }
  return global;
}

function DiscoverFiltersPanel({
  filters,
  onToggle,
  onClear,
}: {
  filters: DiscoverFilters;
  onToggle: (key: keyof DiscoverFilters, value?: string) => void;
  onClear: () => void;
}) {
  const activeCount =
    (filters.category ? 1 : 0) +
    (filters.verified ? 1 : 0) +
    (filters.liquidityLocked ? 1 : 0) +
    (filters.ownershipRenounced ? 1 : 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">Filter tokens</p>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 text-xs text-primary hover:underline"
          >
            Clear all
          </button>
        )}
      </div>
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground">Category</Label>
        <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto overscroll-contain pr-1">
          {TOKEN_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onToggle("category", cat)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                filters.category === cat
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-muted text-foreground hover:bg-muted/80"
              )}
            >
              {TOKEN_CATEGORY_LABELS[cat as TokenCategoryId]}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3 border-t border-border pt-4">
        <Label className="text-xs font-medium text-muted-foreground">Trust filters</Label>
        <div className="space-y-2.5">
        {(
          [
            ["verified", "Verified Creator"],
            ["liquidityLocked", "Liquidity Locked"],
            ["ownershipRenounced", "Ownership Renounced"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex cursor-pointer items-center gap-2.5 text-sm text-foreground">
            <Checkbox
              checked={!!filters[key]}
              onCheckedChange={() => onToggle(key)}
            />
            {label}
          </label>
        ))}
        </div>
      </div>
    </div>
  );
}

function DiscoverSectionRow({
  sectionId,
  label,
  description,
  variant,
  filters,
}: {
  sectionId: string;
  label: string;
  description: string;
  variant: "trending" | "grid";
  filters: DiscoverFilters;
}) {
  const chainId = getActiveChainId();
  const queryFilters = sectionFilters(sectionId, filters);

  const { data: tokens = [], isLoading } = useQuery({
    queryKey: tokenQueryKeys.discover(sectionId, chainId, queryFilters),
    queryFn: () => fetchDiscoverTokens(sectionId, 24, queryFilters),
    staleTime: 15_000,
  });

  return (
    <TokenGridCarousel
      id={`section-${sectionId}`}
      title={label}
      description={description}
      tokens={tokens}
      isLoading={isLoading}
      variant={variant}
      fetchLimit={24}
    />
  );
}

function DiscoverContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<DiscoverFilters>(() => ({
    category: searchParams.get("category") ?? undefined,
    verified: searchParams.get("verified") === "true",
    liquidityLocked: searchParams.get("liquidityLocked") === "true",
    ownershipRenounced: searchParams.get("ownershipRenounced") === "true",
  }));

  const activeFilterCount =
    (filters.category ? 1 : 0) +
    (filters.verified ? 1 : 0) +
    (filters.liquidityLocked ? 1 : 0) +
    (filters.ownershipRenounced ? 1 : 0);

  useEffect(() => {
    if (!filtersOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setFiltersOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [filtersOpen]);

  useEffect(() => {
    const sectionParam = searchParams.get("section");
    if (!sectionParam) return;
    const el = document.getElementById(`section-${sectionParam}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [searchParams]);

  function updateUrl(nextFilters: DiscoverFilters) {
    const params = new URLSearchParams();
    const sectionParam = searchParams.get("section");
    if (sectionParam) params.set("section", sectionParam);
    if (nextFilters.category) params.set("category", nextFilters.category);
    if (nextFilters.verified) params.set("verified", "true");
    if (nextFilters.liquidityLocked) params.set("liquidityLocked", "true");
    if (nextFilters.ownershipRenounced) params.set("ownershipRenounced", "true");
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }

  function toggleFilter(key: keyof DiscoverFilters, value?: string) {
    const next = { ...filters };
    if (key === "category") {
      next.category = next.category === value ? undefined : value;
    } else {
      next[key] = !next[key];
    }
    setFilters(next);
    updateUrl(next);
  }

  function clearFilters() {
    setFilters({});
    updateUrl({});
  }

  return (
    <div className="space-y-10 py-2 sm:space-y-12 sm:py-4">
      <header className="relative z-40 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Explore Tokens</h1>
          <p className="mt-1 text-muted-foreground">
            Browse every category — use the arrows to scroll through tokens in each section.
          </p>
        </div>
        <div ref={filtersRef} className="relative shrink-0">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={cn(
              "relative h-9 w-9",
              filtersOpen && "border-primary/40 bg-primary/5 text-primary"
            )}
            aria-label="Filter tokens by category"
            title="Filter by category"
            onClick={() => setFiltersOpen((o) => !o)}
          >
            <Settings2 className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
          {filtersOpen && (
            <div className="absolute right-0 top-full z-[100] mt-2 w-[min(calc(100vw-2rem),360px)] rounded-xl border border-border bg-background p-4 shadow-2xl">
              <DiscoverFiltersPanel
                filters={filters}
                onToggle={toggleFilter}
                onClear={clearFilters}
              />
            </div>
          )}
        </div>
      </header>

      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-sm">
          <span className="text-muted-foreground">
            {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} applied to all sections
          </span>
          {filters.category && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {TOKEN_CATEGORY_LABELS[filters.category as TokenCategoryId] ?? filters.category}
            </span>
          )}
          <button
            type="button"
            className="ml-auto text-xs text-primary hover:underline"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        </div>
      )}

      <div className="space-y-10 sm:space-y-12">
        {sections.map((s) => (
          <DiscoverSectionRow
            key={s.id}
            sectionId={s.id}
            label={s.label}
            description={s.description}
            variant={s.variant}
            filters={filters}
          />
        ))}
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-10 py-2 sm:py-4">
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="h-8 w-40 animate-pulse rounded bg-muted" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-48 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            </div>
          ))}
        </div>
      }
    >
      <DiscoverContent />
    </Suspense>
  );
}
