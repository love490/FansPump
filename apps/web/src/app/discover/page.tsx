"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TokenCard, type TokenCardData } from "@/components/tokens/token-card";
import { cn } from "@/lib/utils";

const sections = [
  { id: "new", label: "New Token" },
  { id: "trending", label: "Trending" },
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
  const sectionParam = searchParams.get("section");
  const initialSection =
    sectionParam && sectionIds.has(sectionParam as (typeof sections)[number]["id"])
      ? sectionParam
      : "new";

  const [section, setSection] = useState(initialSection);
  const [tokens, setTokens] = useState<TokenCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sectionParam && sectionIds.has(sectionParam as (typeof sections)[number]["id"])) {
      setSection(sectionParam);
    }
  }, [sectionParam]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/tokens?section=${section}`)
      .then((r) => r.json())
      .then((d) => setTokens(d.tokens ?? []))
      .finally(() => setLoading(false));
  }, [section]);

  function selectSection(id: string) {
    setSection(id);
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", id);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
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

      <section aria-labelledby="discover-results-heading">
        <h2 id="discover-results-heading" className="sr-only">
          {activeLabel}
        </h2>
        {loading ? (
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
