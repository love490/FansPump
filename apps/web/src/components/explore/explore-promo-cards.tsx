"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CircleDollarSign, Layers, Megaphone } from "lucide-react";
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
    label: "News",
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
  if (!Number.isFinite(value) || value <= 0) return "$0";
  if (value >= 1_000_000_000) return `$${trimAmount(value / 1_000_000_000)}B`;
  if (value >= 1_000_000) return `$${trimAmount(value / 1_000_000)}M`;
  if (value >= 1_000) return `$${trimAmount(value / 1_000)}K`;
  return `$${Math.round(value).toLocaleString()}`;
}

function trimAmount(n: number): string {
  return n.toFixed(n >= 10 ? 0 : 1).replace(/\.0$/, "");
}

function formatLiquidityHeadline(raw: string): string | null {
  try {
    const n = BigInt(raw);
    if (n <= 0n) return null;
    const scaled = Number(n / 10n ** 18n);
    if (!Number.isFinite(scaled) || scaled <= 0) return null;
    return formatRewardTotal(scaled);
  } catch {
    return null;
  }
}

function headlineClass(text: string): string {
  if (text.length > 12) return "mt-5 text-lg font-extrabold tracking-tight sm:text-xl";
  if (text.length > 8) return "mt-5 text-xl font-extrabold tracking-tight sm:text-2xl";
  return "mt-5 text-2xl font-extrabold tracking-tight sm:text-3xl";
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
        const formatted = formatLiquidityHeadline(String(data?.analytics?.totalLiquidity ?? "0"));
        if (formatted) setPoolHeadline(formatted);
      })
      .catch(() => {});
  }, []);

  const cards = DEFAULT_CARDS.map((card) => ({
    ...card,
    headline:
      card.id === "earn" ? earnHeadline : card.id === "pool-share" ? poolHeadline : card.headline,
  }));

  return (
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
            <div className="relative flex h-full min-h-[11rem] flex-col sm:min-h-[12rem]">
              <div className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    "inline-flex rounded-xl p-2.5",
                    card.iconBg
                  )}
                >
                  <card.icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <span className="shrink-0 rounded-full border border-border bg-background/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {card.label}
                </span>
              </div>

              <p className={cn(headlineClass(card.headline), "min-w-0 break-words")} title={card.headline}>
                {card.headline}
              </p>
              <p className="mt-2 text-sm font-medium text-muted-foreground">{card.subtitle}</p>

              <span className="mt-auto pt-5 text-sm font-semibold tracking-widest text-primary transition-transform group-hover:translate-x-0.5">
                &gt;&gt;&gt;
              </span>
            </div>
          </Link>
        ))}
    </div>
  );
}
