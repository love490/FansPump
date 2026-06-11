import { cn } from "@/lib/utils";

/** Responsive shell: min-height, padding, hover lift + glow. */
export const tokenCardShellClass = cn(
  "group/card relative flex h-full w-full min-w-0 flex-col overflow-hidden",
  "rounded-2xl border border-border/70 bg-card/95 shadow-sm backdrop-blur-sm",
  "transition-[transform,box-shadow,border-color] duration-300 ease-out",
  "hover:-translate-y-1 hover:border-primary/45",
  "hover:shadow-[0_12px_40px_-12px_rgba(15,66,168,0.35)]",
  "min-h-[180px] p-4",
  "md:min-h-[190px] md:p-[18px]",
  "lg:min-h-[210px] lg:p-5",
  "xl:min-h-[220px] xl:p-6"
);

/** Mobile carousel peek: ~1.5 cards visible in horizontal scroll. */
export const tokenCardMobilePeekClass =
  "snap-start shrink-0 w-[calc((100vw-3rem)/1.5)] max-w-[420px] md:w-auto md:max-w-none md:shrink md:snap-align-none";

/** Grid layouts for token card lists (discover, dashboard, watchlist, etc.). */
export const tokenCardGridClass = cn(
  "grid w-full min-w-0 gap-4",
  "md:grid-cols-3 md:gap-5",
  "lg:grid-cols-5 lg:gap-5",
  "min-[1440px]:grid-cols-6 min-[1440px]:gap-6"
);

export const tokenCardMobileScrollClass = cn(
  "flex w-full min-w-0 gap-4 overflow-x-auto pb-2",
  "snap-x snap-mandatory scroll-smooth",
  "-mx-4 px-4",
  "md:mx-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:pb-0 md:px-0 md:snap-none",
  "lg:grid-cols-5",
  "min-[1440px]:grid-cols-6 min-[1440px]:gap-6"
);

export function tokenCardSkeletonClass() {
  return cn(tokenCardShellClass, "animate-pulse border-transparent bg-muted/60 shadow-none");
}
