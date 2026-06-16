import { cn } from "@/lib/utils";

/** Responsive shell: hero image bleeds to edges, details padded below. */
export const tokenCardShellClass = cn(
  "group/card relative flex h-full w-full min-w-0 flex-col overflow-hidden",
  "rounded-xl border border-border/70 bg-card shadow-sm",
  "transition-[transform,box-shadow,border-color] duration-300 ease-out",
  "hover:-translate-y-0.5 hover:border-primary/45",
  "hover:shadow-[0_8px_28px_-10px_rgba(30,91,255,0.22)]"
);

/** Mobile carousel peek: ~1.5 cards visible in horizontal scroll. */
export const tokenCardMobilePeekClass =
  "snap-start shrink-0 w-[calc((100vw-3rem)/1.65)] max-w-[180px] md:w-auto md:max-w-none md:shrink md:snap-align-none";

/** Fixed hero ratio so every card image area matches card width. */
export const tokenCardHeroClass =
  "relative aspect-[5/3] w-full shrink-0 overflow-hidden bg-muted";

/** Bottom metrics row height is consistent across cards. */
export const tokenCardMetricsClass =
  "mt-auto grid grid-cols-3 gap-1 border-t border-border/50 pt-1.5";

/** Grid layouts for token card lists (discover, dashboard, watchlist, etc.). */
export const tokenCardGridClass = cn(
  "grid w-full min-w-0 items-stretch gap-2",
  "grid-cols-2",
  "md:grid-cols-3 md:gap-2.5",
  "lg:grid-cols-5 lg:gap-3",
  "min-[1440px]:grid-cols-6 min-[1440px]:gap-3"
);

export const tokenCardMobileScrollClass = cn(
  "flex w-full min-w-0 items-stretch gap-2 overflow-x-auto pb-2",
  "snap-x snap-mandatory scroll-smooth",
  "-mx-4 px-4",
  "md:mx-0 md:grid md:grid-cols-3 md:gap-2.5 md:overflow-visible md:pb-0 md:px-0 md:snap-none",
  "lg:grid-cols-5 lg:gap-3",
  "min-[1440px]:grid-cols-6 min-[1440px]:gap-3"
);

/** Home carousels: less dense than Discover grid, consistent across sections. */
export const tokenCardCarouselGridClass = cn(
  "grid w-full min-w-0 items-stretch gap-3",
  "sm:grid-cols-2",
  "lg:grid-cols-4 lg:gap-4",
  "min-[1440px]:grid-cols-5 min-[1440px]:gap-5"
);

export const tokenCardCarouselScrollClass = cn(
  "flex w-full min-w-0 items-stretch gap-3 overflow-x-auto pb-2",
  "snap-x snap-mandatory scroll-smooth",
  "-mx-4 px-4",
  "md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:pb-0 md:px-0 md:snap-none",
  "lg:grid-cols-4",
  "min-[1440px]:grid-cols-5 min-[1440px]:gap-5"
);

export function tokenCardSkeletonClass() {
  return cn(tokenCardShellClass, "animate-pulse border-transparent bg-muted/60 shadow-none");
}
