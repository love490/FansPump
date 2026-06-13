"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CircleDollarSign, Layers, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

type PromoCard = {
  id: string;
  href: string;
  label: string;
  headline: string;
  subtitle: string;
  icon: typeof Megaphone;
  gradient: string;
  iconBg: string;
};

const DEFAULT_CARDS: PromoCard[] = [
  {
    id: "announce",
    href: "/discover?section=new",
    label: "Announce",
    headline: "New launches",
    subtitle: "See latest tokens on OPN Network",
    icon: Megaphone,
    gradient: "from-sky-500/15 via-primary/10 to-transparent",
    iconBg: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  },
  {
    id: "earn",
    href: "/earn",
    label: "Earn",
    headline: "$100,000",
    subtitle: "Stake OPN · Join quests",
    icon: CircleDollarSign,
    gradient: "from-violet-500/15 via-amber-500/10 to-transparent",
    iconBg: "bg-gradient-to-br from-violet-500/20 to-amber-500/20 text-violet-600 dark:text-violet-400",
  },
  {
    id: "pool-share",
    href: "/staking",
    label: "Pool Share",
    headline: "$250,000",
    subtitle: "Stake OPN for token pool share",
    icon: Layers,
    gradient: "from-emerald-500/15 via-primary/10 to-transparent",
    iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
];

function formatRewardTotal(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000).toLocaleString()},000`;
  return `$${Math.round(value).toLocaleString()}`;
}

export function ExplorePromoCards() {
  const [earnHeadline, setEarnHeadline] = useState("$100,000");
  const [poolHeadline, setPoolHeadline] = useState("$250,000");

  useEffect(() => {
    fetch("/api/bounties?tab=active&limit=50")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const bounties = (data?.bounties ?? []) as { rewardType?: string; rewardAmount?: string }[];
        const opnTotal = bounties
          .filter((b) => b.rewardType === "OPN")
          .reduce((sum, b) => sum + Number(b.rewardAmount || 0), 0);
        if (opnTotal >= 1000) {
          setEarnHeadline(formatRewardTotal(opnTotal));
        }
      })
      .catch(() => {});

    fetch("/api/pools?limit=1")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const liquidity = Number(data?.analytics?.totalLiquidity ?? 0);
        if (liquidity > 0) {
          setPoolHeadline(formatRewardTotal(liquidity));
        }
      })
      .catch(() => {});
  }, []);

  const cards = DEFAULT_CARDS.map((card) => ({
    ...card,
    headline:
      card.id === "earn" ? earnHeadline : card.id === "pool-share" ? poolHeadline : card.headline,
  }));

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold sm:text-xl">Featured on FansPump</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Announcements, quests, and pool rewards on OPN Network.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.id}
            href={card.href}
            className={cn(
              "group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all",
              "hover:border-primary/40 hover:shadow-[0_0_28px_rgba(30,91,255,0.12)]"
            )}
          >
            <div
              className={cn(
                "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80",
                card.gradient
              )}
            />
            <div className="relative flex h-full flex-col">
              <div className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    "inline-flex rounded-xl p-2.5",
                    card.iconBg
                  )}
                >
                  <card.icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <span className="rounded-full border border-border bg-background/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {card.label}
                </span>
              </div>

              <p className="mt-5 text-2xl font-extrabold tracking-tight sm:text-3xl">{card.headline}</p>
              <p className="mt-2 text-sm font-medium text-muted-foreground">{card.subtitle}</p>

              <span className="mt-auto flex items-center gap-1 pt-5 text-sm font-semibold text-primary">
                Open
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
