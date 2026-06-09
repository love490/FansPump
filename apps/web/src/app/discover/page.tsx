"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Settings2 } from "lucide-react";
import { TokenCard } from "@/components/tokens/token-card";
import { cn } from "@/lib/utils";
import { fetchDiscoverTokens, tokenQueryKeys, type DiscoverFilters } from "@/lib/tokens-api";
import { getActiveChainId } from "@/lib/chain-config/opn";
import { TOKEN_CATEGORIES, TOKEN_CATEGORY_LABELS, type TokenCategoryId } from "@iopn/shared";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const sections = [
  { id: "latest", label: "Latest" },
  { id: "trending", label: "Trending" },
  { id: "verified", label: "Verified" },
  { id: "new", label: "New Token" },
  { id: "views", label: "Most Viewed" },
  { id: "holders", label: "Most Holders" },
  { id: "updated", label: "Recently Updated" },
  { id: "featured", label: "Featured Projects" },
] as const;

const sectionIds = new Set(sections.map((s) => s.id));

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
    <div className="space-y-4 p-1">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Filter by token type</p>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-primary hover:underline"
          >
            Clear all
          </button>
        )}
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Category</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {TOKEN_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onToggle("category", cat)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                filters.category === cat
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {TOKEN_CATEGORY_LABELS[cat as TokenCategoryId]}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2 border-t border-border pt-3">
        {(
          [
            ["verified", "Verified Creator"],
            ["liquidityLocked", "Liquidity Locked"],
            ["ownershipRenounced", "Ownership Renounced"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={!!filters[key]}
              onCheckedChange={() => onToggle(key)}
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}

function DiscoverContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const chainId = getActiveChainId();
  const sectionParam = searchParams.get("section");
  const initialSection =
    sectionParam && sectionIds.has(sectionParam as (typeof sections)[number]["id"])
      ? sectionParam
      : "latest";

  const [section, setSection] = useState(initialSection);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<DiscoverFilters>({
    category: searchParams.get("category") ?? undefined,
    verified: searchParams.get("verified") === "true",
    liquidityLocked: searchParams.get("liquidityLocked") === "true",
    ownershipRenounced: searchParams.get("ownershipRenounced") === "true",
  });

  const activeFilterCount =
    (filters.category ? 1 : 0) +
    (filters.verified ? 1 : 0) +
    (filters.liquidityLocked ? 1 : 0) +
    (filters.ownershipRenounced ? 1 : 0);

  useEffect(() => {
    if (sectionParam && sectionIds.has(sectionParam as (typeof sections)[number]["id"])) {
      setSection(sectionParam);
    }
  }, [sectionParam]);

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

  const { data: tokens = [], isLoading } = useQuery({
    queryKey: tokenQueryKeys.discover(section, chainId, filters),
    queryFn: () => fetchDiscoverTokens(section, 24, filters),
    staleTime: 15_000,
  });

  function updateUrl(nextSection: string, nextFilters: DiscoverFilters) {
    const params = new URLSearchParams();
    params.set("section", nextSection);
    if (nextFilters.category) params.set("category", nextFilters.category);
    if (nextFilters.verified) params.set("verified", "true");
    if (nextFilters.liquidityLocked) params.set("liquidityLocked", "true");
    if (nextFilters.ownershipRenounced) params.set("ownershipRenounced", "true");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function selectSection(id: string) {
    setSection(id);
    updateUrl(id, filters);
  }

  function toggleFilter(key: keyof DiscoverFilters, value?: string) {
    const next = { ...filters };
    if (key === "category") {
      next.category = next.category === value ? undefined : value;
    } else {
      next[key] = !next[key];
    }
    setFilters(next);
    updateUrl(section, next);
  }

  function clearFilters() {
    const empty: DiscoverFilters = {};
    setFilters(empty);
    updateUrl(section, empty);
  }

  const activeLabel = sections.find((s) => s.id === section)?.label ?? "Tokens";

  return (
    <div className="space-y-6 py-2 sm:py-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Explore Tokens</h1>
          <p className="mt-1 text-muted-foreground">
            Discover tokens on FansPump — curated for serious projects.
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
            aria-label="Filter tokens"
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
            <div className="absolute right-0 top-full z-50 mt-2 w-[min(calc(100vw-2rem),320px)] rounded-lg border bg-popover p-3 shadow-lg">
              <DiscoverFiltersPanel
                filters={filters}
                onToggle={toggleFilter}
                onClear={clearFilters}
              />
            </div>
          )}
        </div>
      </header>

      <nav
        aria-label="Token categories"
        className="flex flex-col gap-1 border-b border-border pb-6 sm:max-w-xs"
      >
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => selectSection(s.id)}
            className={cn(
              "w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors",
              section === s.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {activeFilterCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} active — open{" "}
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => setFiltersOpen(true)}
          >
            settings
          </button>{" "}
          to adjust
        </p>
      )}

      <section aria-labelledby="discover-results-heading">
        <h2 id="discover-results-heading" className="sr-only">
          {activeLabel}
        </h2>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : tokens.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground">No tokens in this section yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tokens.map((t, i) => (
              <TokenCard key={t.id} token={t} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 py-2 sm:py-4">
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
          <div className="h-48 animate-pulse rounded-lg bg-muted sm:max-w-xs" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      }
    >
      <DiscoverContent />
    </Suspense>
  );
}
