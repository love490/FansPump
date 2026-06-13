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

const DEFAULT_SECTION = "trending";

const browseSections = [
  {
    id: "trending",
    label: "Trending",
    description: "Tokens with the highest trending score right now.",
    variant: "trending" as const,
  },
  {
    id: "new",
    label: "Newly Created",
    description: "Newly launched tokens — sorted by launch date.",
    variant: "grid" as const,
  },
  {
    id: "latest",
    label: "Latest",
    description: "Most recently added tokens on the platform.",
    variant: "grid" as const,
  },
  {
    id: "verified",
    label: "Verified",
    description: "Projects from verified creators.",
    variant: "grid" as const,
  },
  {
    id: "featured",
    label: "Featured",
    description: "Hand-picked featured projects.",
    variant: "grid" as const,
  },
  {
    id: "most-trusted",
    label: "Most Trusted",
    description: "Tokens with the highest trust scores.",
    variant: "grid" as const,
  },
  {
    id: "fastest-growing",
    label: "Fastest Growing",
    description: "Tokens gaining holders and momentum quickly.",
    variant: "grid" as const,
  },
  {
    id: "recently-verified",
    label: "Recently Verified",
    description: "Projects with approved contract verification.",
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
] as const;

type BrowseSectionId = (typeof browseSections)[number]["id"];

function isBrowseSectionId(value: string | null): value is BrowseSectionId {
  return browseSections.some((s) => s.id === value);
}

function sectionMeta(sectionId: BrowseSectionId) {
  return browseSections.find((s) => s.id === sectionId)!;
}

function sectionFilters(sectionId: string, global: DiscoverFilters): DiscoverFilters {
  if (sectionId === "verified") {
    return { ...global, verified: true };
  }
  return global;
}

function DiscoverExplorePanel({
  activeSection,
  filters,
  onSelectSection,
  onToggle,
  onClear,
}: {
  activeSection: BrowseSectionId;
  filters: DiscoverFilters;
  onSelectSection: (sectionId: BrowseSectionId) => void;
  onToggle: (key: keyof DiscoverFilters, value?: string) => void;
  onClear: () => void;
}) {
  const activeFilterCount =
    (filters.category ? 1 : 0) +
    (filters.verified ? 1 : 0) +
    (filters.liquidityLocked ? 1 : 0) +
    (filters.ownershipRenounced ? 1 : 0);

  return (
    <div className="max-h-[min(70vh,520px)] space-y-5 overflow-y-auto overscroll-contain pr-1">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">Browse Explore</p>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 text-xs text-primary hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Sections</Label>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-1">
          {browseSections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelectSection(section.id)}
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors sm:text-sm",
                activeSection === section.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-muted/40 text-foreground hover:bg-muted"
              )}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <Label className="text-xs font-medium text-muted-foreground">Category</Label>
        <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto overscroll-contain">
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
              <Checkbox checked={!!filters[key]} onCheckedChange={() => onToggle(key)} />
              {label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function DiscoverContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);

  const sectionParam = searchParams.get("section");
  const activeSection: BrowseSectionId = isBrowseSectionId(sectionParam)
    ? sectionParam
    : DEFAULT_SECTION;

  const [filters, setFilters] = useState<DiscoverFilters>(() => ({
    category: searchParams.get("category") ?? undefined,
    verified: searchParams.get("verified") === "true",
    liquidityLocked: searchParams.get("liquidityLocked") === "true",
    ownershipRenounced: searchParams.get("ownershipRenounced") === "true",
  }));

  const chainId = getActiveChainId();
  const meta = sectionMeta(activeSection);
  const queryFilters = sectionFilters(activeSection, filters);

  const { data: tokens = [], isLoading } = useQuery({
    queryKey: tokenQueryKeys.discover(activeSection, chainId, queryFilters),
    queryFn: () => fetchDiscoverTokens(activeSection, 24, queryFilters),
    staleTime: 15_000,
  });

  const activeFilterCount =
    (filters.category ? 1 : 0) +
    (filters.verified ? 1 : 0) +
    (filters.liquidityLocked ? 1 : 0) +
    (filters.ownershipRenounced ? 1 : 0);

  function buildUrl(section: BrowseSectionId, nextFilters: DiscoverFilters) {
    const params = new URLSearchParams();
    params.set("section", section);
    if (nextFilters.category) params.set("category", nextFilters.category);
    if (nextFilters.verified) params.set("verified", "true");
    if (nextFilters.liquidityLocked) params.set("liquidityLocked", "true");
    if (nextFilters.ownershipRenounced) params.set("ownershipRenounced", "true");
    return `${pathname}?${params.toString()}`;
  }

  function updateUrl(section: BrowseSectionId, nextFilters: DiscoverFilters) {
    router.replace(buildUrl(section, nextFilters), { scroll: false });
  }

  useEffect(() => {
    if (sectionParam) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", DEFAULT_SECTION);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [sectionParam, pathname, router, searchParams]);

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

  function selectSection(sectionId: BrowseSectionId) {
    setFiltersOpen(false);
    updateUrl(sectionId, filters);
  }

  function toggleFilter(key: keyof DiscoverFilters, value?: string) {
    const next = { ...filters };
    if (key === "category") {
      next.category = next.category === value ? undefined : value;
    } else {
      next[key] = !next[key];
    }
    setFilters(next);
    updateUrl(activeSection, next);
  }

  function clearFilters() {
    setFilters({});
    updateUrl(activeSection, {});
  }

  return (
    <div className="space-y-8 py-2 sm:space-y-10 sm:py-4">
      <header className="relative z-40 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Explore</h1>
          <p className="mt-1 text-muted-foreground">
            Browse {meta.label.toLowerCase()} projects — filter by category, verified, and more.
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
            aria-label="Browse sections and filters"
            title="Browse & filter"
            onClick={() => setFiltersOpen((o) => !o)}
          >
            <Settings2 className="h-4 w-4" />
            {(activeFilterCount > 0 || activeSection !== DEFAULT_SECTION) && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {activeFilterCount + (activeSection !== DEFAULT_SECTION ? 1 : 0)}
              </span>
            )}
          </Button>
          {filtersOpen && (
            <div className="absolute right-0 top-full z-[100] mt-2 w-[min(calc(100vw-2rem),380px)] rounded-xl border border-border bg-background p-4 shadow-2xl">
              <DiscoverExplorePanel
                activeSection={activeSection}
                filters={filters}
                onSelectSection={selectSection}
                onToggle={toggleFilter}
                onClear={clearFilters}
              />
            </div>
          )}
        </div>
      </header>

      {(activeFilterCount > 0 || activeSection !== DEFAULT_SECTION) && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-sm">
          {activeSection !== DEFAULT_SECTION && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {meta.label}
            </span>
          )}
          {filters.category && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {TOKEN_CATEGORY_LABELS[filters.category as TokenCategoryId] ?? filters.category}
            </span>
          )}
          {filters.verified && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              Verified
            </span>
          )}
          {filters.liquidityLocked && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              Liquidity locked
            </span>
          )}
          {filters.ownershipRenounced && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              Ownership renounced
            </span>
          )}
          <button
            type="button"
            className="ml-auto text-xs text-primary hover:underline"
            onClick={() => {
              setFilters({});
              updateUrl(DEFAULT_SECTION, {});
            }}
          >
            Reset
          </button>
        </div>
      )}

      <TokenGridCarousel
        id={`section-${activeSection}`}
        title={meta.label}
        description={meta.description}
        tokens={tokens}
        isLoading={isLoading}
        variant={meta.variant}
        fetchLimit={24}
      />
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8 py-2 sm:py-4">
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
          <div className="space-y-3">
            <div className="h-8 w-40 animate-pulse rounded bg-muted" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="h-48 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <DiscoverContent />
    </Suspense>
  );
}
