import { cn } from "@/lib/utils";

/** Responsive shell: hero image bleeds to edges, details padded below. */
export const tokenCardShellClass = cn(
  "group/card relative flex h-full w-full min-w-0 flex-col overflow-hidden",
  "rounded-2xl border border-border/70 bg-card shadow-sm",
  "transition-[transform,box-shadow,border-color] duration-300 ease-out",
  "hover:-translate-y-1 hover:border-primary/45",
  "hover:shadow-[0_12px_40px_-12px_rgba(30,91,255,0.25)]"
);

/** Mobile carousel peek: ~1.5 cards visible in horizontal scroll. */
export const tokenCardMobilePeekClass =
  "snap-start shrink-0 w-[calc((100vw-3rem)/1.5)] max-w-[300px] md:w-auto md:max-w-none md:shrink md:snap-align-none";

/** Grid layouts for token card lists (discover, dashboard, watchlist, etc.). */
export const tokenCardGridClass = cn(
  "grid w-full min-w-0 gap-4",
  "sm:grid-cols-2 sm:gap-5",
  "lg:grid-cols-4 lg:gap-5",
  "min-[1440px]:grid-cols-5 min-[1440px]:gap-6"
);

export const tokenCardMobileScrollClass = cn(
  "flex w-full min-w-0 gap-4 overflow-x-auto pb-2",
  "snap-x snap-mandatory scroll-smooth",
  "-mx-4 px-4",
  "md:mx-0 md:grid md:grid-cols-2 md:gap-5 md:overflow-visible md:pb-0 md:px-0 md:snap-none",
  "lg:grid-cols-4",
  "min-[1440px]:grid-cols-5 min-[1440px]:gap-6"
);

export function tokenCardSkeletonClass() {
  return cn(tokenCardShellClass, "animate-pulse border-transparent bg-muted/60 shadow-none");
}
