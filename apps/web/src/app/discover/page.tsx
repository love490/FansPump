"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Settings2 } from "lucide-react";
import { TokenGridCarousel } from "@/components/tokens/token-grid-carousel";
import {
  countDiscoverFilters,
  DiscoverFilterPanel,
} from "@/components/discover/discover-filter-panel";
import { cn } from "@/lib/utils";
import { fetchDiscoverTokens, tokenQueryKeys, type DiscoverFilters } from "@/lib/tokens-api";
import { getActiveChainId } from "@/lib/chain-config/opn";
import {
  DISCOVER_DEFAULT_SECTION,
  getDiscoverSectionMeta,
  isDiscoverBrowseSectionId,
  type DiscoverBrowseSectionId,
} from "@/lib/discover-sections";
import { TOKEN_CATEGORY_LABELS, type TokenCategoryId } from "@iopn/shared";
import { Button } from "@/components/ui/button";

function sectionFilters(sectionId: string, global: DiscoverFilters): DiscoverFilters {
  if (sectionId === "verified") {
    return { ...global, verified: true };
  }
  return global;
}

function DiscoverContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);

  const sectionParam = searchParams.get("section");
  const activeSection: DiscoverBrowseSectionId = isDiscoverBrowseSectionId(sectionParam)
    ? sectionParam
    : DISCOVER_DEFAULT_SECTION;

  const [filters, setFilters] = useState<DiscoverFilters>(() => ({
    category: searchParams.get("category") ?? undefined,
    verified: searchParams.get("verified") === "true",
    liquidityLocked: searchParams.get("liquidityLocked") === "true",
    ownershipRenounced: searchParams.get("ownershipRenounced") === "true",
  }));

  const chainId = getActiveChainId();
  const meta = getDiscoverSectionMeta(activeSection);
  const queryFilters = sectionFilters(activeSection, filters);

  const { data: tokens = [], isLoading } = useQuery({
    queryKey: tokenQueryKeys.discover(activeSection, chainId, queryFilters),
    queryFn: () =>
      fetchDiscoverTokens(activeSection, activeSection === "all" ? 100 : 24, queryFilters),
    staleTime: 15_000,
  });

  const activeFilterCount = countDiscoverFilters(filters);
  const activeBadgeCount = activeFilterCount + (activeSection !== DISCOVER_DEFAULT_SECTION ? 1 : 0);

  function buildUrl(section: DiscoverBrowseSectionId, nextFilters: DiscoverFilters) {
    const params = new URLSearchParams();
    params.set("section", section);
    if (nextFilters.category) params.set("category", nextFilters.category);
    if (nextFilters.verified) params.set("verified", "true");
    if (nextFilters.liquidityLocked) params.set("liquidityLocked", "true");
    if (nextFilters.ownershipRenounced) params.set("ownershipRenounced", "true");
    return `${pathname}?${params.toString()}`;
  }

  function updateUrl(section: DiscoverBrowseSectionId, nextFilters: DiscoverFilters) {
    router.replace(buildUrl(section, nextFilters), { scroll: false });
  }

  useEffect(() => {
    if (sectionParam) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", DISCOVER_DEFAULT_SECTION);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [sectionParam, pathname, router, searchParams]);

  useEffect(() => {
    if (!filtersOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setFiltersOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setFiltersOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [filtersOpen]);

  function selectSection(sectionId: DiscoverBrowseSectionId) {
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

  function resetAll() {
    setFilters({});
    setFiltersOpen(false);
    updateUrl(DISCOVER_DEFAULT_SECTION, {});
  }

  return (
    <div className="space-y-8 py-2 sm:space-y-10 sm:py-4">
      <header className="relative z-40 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">Discover</h1>
          {activeSection !== "all" && (
            <p className="mt-1 text-muted-foreground">{meta.description}</p>
          )}
        </div>

        <div ref={filtersRef} className="relative shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "relative h-9 gap-1.5 px-2.5 sm:px-3",
              filtersOpen && "border-primary/40 bg-primary/5 text-primary"
            )}
            aria-label="Open discover filters"
            aria-expanded={filtersOpen}
            title="Filter by category, verified, new, and more"
            onClick={() => setFiltersOpen((o) => !o)}
          >
            <Settings2 className="h-4 w-4 shrink-0" />
            <span className="text-xs font-medium sm:text-sm">Filters</span>
            {activeBadgeCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {activeBadgeCount}
              </span>
            )}
          </Button>

          {filtersOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-[90] bg-black/20 sm:hidden"
                aria-label="Close filters"
                onClick={() => setFiltersOpen(false)}
              />
              <div className="fixed inset-x-4 bottom-4 top-auto z-[100] max-h-[min(80vh,560px)] overflow-hidden rounded-xl border border-border bg-background p-4 shadow-2xl sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[min(calc(100vw-2rem),400px)]">
                <DiscoverFilterPanel
                  activeSection={activeSection}
                  filters={filters}
                  onSelectSection={selectSection}
                  onToggle={toggleFilter}
                  onClearFilters={clearFilters}
                  onResetAll={resetAll}
                  onClose={() => setFiltersOpen(false)}
                />
              </div>
            </>
          )}
        </div>
      </header>

      {activeBadgeCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-sm">
          {activeSection !== DISCOVER_DEFAULT_SECTION && (
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
            onClick={resetAll}
          >
            Reset
          </button>
        </div>
      )}

      <TokenGridCarousel
        id={`section-${activeSection}`}
        title={activeSection === "all" ? undefined : meta.label}
        description={activeSection === "all" ? undefined : meta.description}
        tokens={tokens}
        isLoading={isLoading}
        variant={meta.variant}
        fetchLimit={activeSection === "all" ? 100 : 24}
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
