"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { TokenCard } from "@/components/tokens/token-card";
import { cn } from "@/lib/utils";
import { fetchDiscoverTokens, tokenQueryKeys, type DiscoverFilters } from "@/lib/tokens-api";
import { getActiveChainId } from "@/lib/chain-config/opn";
import { TOKEN_CATEGORIES, TOKEN_CATEGORY_LABELS, type TokenCategoryId } from "@iopn/shared";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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
  const [filters, setFilters] = useState<DiscoverFilters>({
    category: searchParams.get("category") ?? undefined,
    verified: searchParams.get("verified") === "true",
    liquidityLocked: searchParams.get("liquidityLocked") === "true",
    ownershipRenounced: searchParams.get("ownershipRenounced") === "true",
  });

  useEffect(() => {
    if (sectionParam && sectionIds.has(sectionParam as (typeof sections)[number]["id"])) {
      setSection(sectionParam);
    }
  }, [sectionParam]);

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

  const activeLabel = sections.find((s) => s.id === section)?.label ?? "Tokens";

  return (
    <div className="space-y-6 py-2 sm:py-4">
      <header>
        <h1 className="text-2xl font-bold">Explore Tokens</h1>
        <p className="mt-1 text-muted-foreground">
          Discover tokens on FansPump — curated for serious projects.
        </p>
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

      <div className="space-y-4 rounded-lg border border-border p-4">
        <p className="text-sm font-medium">Filters</p>
        <div>
          <Label className="text-xs text-muted-foreground">Category</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {TOKEN_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => toggleFilter("category", cat)}
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
        <div className="flex flex-wrap gap-4">
          {(
            [
              ["verified", "Verified Creator"],
              ["liquidityLocked", "Liquidity Locked"],
              ["ownershipRenounced", "Ownership Renounced"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={!!filters[key]}
                onCheckedChange={() => toggleFilter(key)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

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
