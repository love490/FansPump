"use client";

import { apiUrl } from "@/lib/api";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BOUNTY_TABS, type BountyListItem, type BountyTab } from "@/lib/bounties";
import { BountyCard } from "@/components/bounties/bounty-card";
import { Button } from "@/components/ui/button";
import { CircleDollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

export default function EarnPage() {
  const [tab, setTab] = useState<BountyTab>("newest");
  const [bounties, setBounties] = useState<BountyListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(apiUrl(`/api/bounties?tab=${tab}&limit=40`))
      .then((r) => r.json())
      .then((d) => setBounties(d.bounties ?? []))
      .catch(() => setBounties([]))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <CircleDollarSign className="h-7 w-7 text-primary" /> Earn
        </h1>
        <p className="mt-1 text-muted-foreground">
          Complete quests from creators and earn rewards — social, on-chain, and community tasks.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {BOUNTY_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
              tab === t.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-muted hover:bg-muted/80"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading bounties…</p>
      ) : bounties.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <p className="text-muted-foreground">No bounties in this section yet.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/discover?section=all">Discover</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {bounties.map((bounty) => (
            <BountyCard key={bounty.id} bounty={bounty} />
          ))}
        </div>
      )}
    </div>
  );
}
