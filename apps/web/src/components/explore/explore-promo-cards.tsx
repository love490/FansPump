"use client";

import { apiUrl } from "@/lib/api";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  CircleDollarSign,
  Compass,
  Flame,
  Layers,
  Megaphone,
  TrendingUp,
  Eye,
} from "lucide-react";
import { HorizontalMarquee } from "@/components/ui/horizontal-marquee";
import { fetchDiscoverTokens } from "@/lib/tokens-api";
import { cn } from "@/lib/utils";

type PromoCardData = {
  id: string;
  href: string;
  label: string;
  headline: string;
  subtitle: string;
  icon: typeof Megaphone;
  gradient: string;
  iconBg: string;
};

type DiscoverSlide = {
  id: string;
  headline: string;
  subtitle: string;
  href: string;
  icon: typeof Flame;
  gradient: string;
  iconBg: string;
};

type PromoNewsItem = {
  id: string;
  title: string;
  tokenSymbol: string;
  tokenName: string;
  href: string;
};

const DISCOVER_SLIDES: Omit<DiscoverSlide, "headline">[] = [
  {
    id: "trending",
    subtitle: "Tokens gaining momentum right now",
    href: "/discover?section=trending",
    icon: Flame,
    gradient: "from-orange-500/15 via-primary/10 to-transparent",
    iconBg: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  },
  {
    id: "trading",
    subtitle: "Highest 24h volume movers",
    href: "/discover?section=gainer",
    icon: TrendingUp,
    gradient: "from-emerald-500/15 via-primary/10 to-transparent",
    iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "popularity",
    subtitle: "Most viewed tokens on FansPump",
    href: "/discover?section=views",
    icon: Eye,
    gradient: "from-violet-500/15 via-primary/10 to-transparent",
    iconBg: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  },
];

function shuffleSlides<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

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

function truncateText(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

function PromoCardShell({
  card,
  className,
  children,
}: {
  card: Pick<PromoCardData, "href" | "gradient" | "icon" | "iconBg" | "label" | "headline" | "subtitle">;
  className?: string;
  children?: React.ReactNode;
}) {
  const Icon = card.icon;

  return (
    <Link
      href={card.href}
      className={cn(
        "group relative block shrink-0 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all",
        "w-[min(88vw,300px)] sm:w-[320px]",
        "hover:border-primary/40 hover:shadow-[0_0_28px_rgba(30,91,255,0.12)]",
        className
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
          <span className={cn("inline-flex rounded-xl p-2.5", card.iconBg)}>
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <span className="shrink-0 rounded-full border border-border bg-background/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {card.label}
          </span>
        </div>

        {children ?? (
          <>
            <p className={cn(headlineClass(card.headline), "min-w-0 break-words")} title={card.headline}>
              {card.headline}
            </p>
            <p className="mt-2 text-sm font-medium text-muted-foreground">{card.subtitle}</p>
          </>
        )}

        <span className="mt-auto pt-5 text-sm font-semibold tracking-widest text-primary transition-transform group-hover:translate-x-0.5">
          &gt;&gt;&gt;
        </span>
      </div>
    </Link>
  );
}

function DiscoverPromoCard({ slides }: { slides: DiscoverSlide[] }) {
  const [index, setIndex] = useState(0);
  const slide = slides[index] ?? slides[0];

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, [slides.length]);

  if (!slide) return null;

  return (
    <PromoCardShell
      card={{
        href: slide.href,
        label: "Discover",
        headline: slide.headline,
        subtitle: slide.subtitle,
        icon: Compass,
        gradient: slide.gradient,
        iconBg: slide.iconBg,
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
        >
          <div className="mt-3 flex items-center gap-2">
            <span className={cn("inline-flex rounded-lg p-1.5", slide.iconBg)}>
              <slide.icon className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <p className={cn(headlineClass(slide.headline), "mt-0 min-w-0 break-words")} title={slide.headline}>
              {slide.headline}
            </p>
          </div>
          <p className="mt-2 text-sm font-medium text-muted-foreground">{slide.subtitle}</p>
        </motion.div>
      </AnimatePresence>
    </PromoCardShell>
  );
}

export function ExplorePromoCards() {
  const [earnHeadline, setEarnHeadline] = useState("$100,000");
  const [poolHeadline, setPoolHeadline] = useState("$250,000");
  const [newsItems, setNewsItems] = useState<PromoNewsItem[]>([]);
  const [banner, setBanner] = useState("");
  const [discoverSlides, setDiscoverSlides] = useState<DiscoverSlide[]>(() =>
    shuffleSlides(
      DISCOVER_SLIDES.map((slide) => ({
        ...slide,
        headline: slide.id === "trending" ? "Trending" : slide.id === "trading" ? "Top trading" : "Most popular",
      }))
    )
  );

  useEffect(() => {
    fetch(apiUrl("/api/platform/promo"))
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setBanner(String(data.banner ?? ""));
        setNewsItems(Array.isArray(data.announcements) ? data.announcements : []);
      })
      .catch(() => {});

    fetch(apiUrl("/api/bounties?tab=active&limit=50"))
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

    fetch(apiUrl("/api/pools?limit=1"))
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const formatted = formatLiquidityHeadline(String(data?.analytics?.totalLiquidity ?? "0"));
        if (formatted) setPoolHeadline(formatted);
      })
      .catch(() => {});

    Promise.all([
      fetchDiscoverTokens("trending", 1).catch(() => []),
      fetchDiscoverTokens("gainer", 1).catch(() => []),
      fetchDiscoverTokens("views", 1).catch(() => []),
    ]).then(([trending, gainer, views]) => {
      const tokenBySection = {
        trending: trending[0],
        trading: gainer[0],
        popularity: views[0],
      };

      setDiscoverSlides(
        shuffleSlides(
          DISCOVER_SLIDES.map((slide) => {
            const token =
              slide.id === "trending"
                ? tokenBySection.trending
                : slide.id === "trading"
                  ? tokenBySection.trading
                  : tokenBySection.popularity;

            const fallbackHeadline =
              slide.id === "trending"
                ? "Trending now"
                : slide.id === "trading"
                  ? "Top trading"
                  : "Most popular";

            return {
              ...slide,
              headline: token?.symbol ? `$${token.symbol}` : fallbackHeadline,
              subtitle: token?.name
                ? `${token.name} · ${slide.subtitle}`
                : slide.subtitle,
            };
          })
        )
      );
    });
  }, []);

  const newsCards = useMemo(() => {
    const cards: PromoCardData[] = [];

    if (banner) {
      cards.push({
        id: "platform-banner",
        href: "/discover?section=new",
        label: "News",
        headline: truncateText(banner, 48),
        subtitle: "Platform announcement",
        icon: Megaphone,
        gradient: "from-sky-500/15 via-primary/10 to-transparent",
        iconBg: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
      });
    }

    for (const item of newsItems) {
      cards.push({
        id: item.id,
        href: item.href,
        label: "News",
        headline: truncateText(item.title, 48),
        subtitle: `${item.tokenSymbol} · ${item.tokenName}`,
        icon: Megaphone,
        gradient: "from-sky-500/15 via-primary/10 to-transparent",
        iconBg: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
      });
    }

    if (cards.length === 0) {
      cards.push({
        id: "default-news",
        href: "/discover?section=new",
        label: "News",
        headline: "New launches",
        subtitle: "See latest tokens on OPN Network",
        icon: Megaphone,
        gradient: "from-sky-500/15 via-primary/10 to-transparent",
        iconBg: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
      });
    }

    return cards;
  }, [banner, newsItems]);

  const earnCard = useMemo<PromoCardData>(
    () => ({
      id: "earn",
      href: "/earn",
      label: "Earn",
      headline: earnHeadline,
      subtitle: "Stake OPN · Join quests",
      icon: CircleDollarSign,
      gradient: "from-violet-500/15 via-amber-500/10 to-transparent",
      iconBg: "bg-gradient-to-br from-violet-500/20 to-amber-500/20 text-violet-600 dark:text-violet-400",
    }),
    [earnHeadline]
  );

  const poolCard = useMemo<PromoCardData>(
    () => ({
      id: "pool-share",
      href: "/staking",
      label: "Pool Share",
      headline: poolHeadline,
      subtitle: "Stake OPN for token pool share",
      icon: Layers,
      gradient: "from-emerald-500/15 via-primary/10 to-transparent",
      iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    }),
    [poolHeadline]
  );

  const marqueeDuration = Math.max((newsCards.length + 2) * 14, 42);

  return (
    <HorizontalMarquee durationSeconds={marqueeDuration} className="-mx-1 px-1">
      {newsCards.map((card) => (
        <PromoCardShell key={card.id} card={card} />
      ))}
      <PromoCardShell card={earnCard} />
      <PromoCardShell card={poolCard} />
      <DiscoverPromoCard slides={discoverSlides} />
    </HorizontalMarquee>
  );
}
