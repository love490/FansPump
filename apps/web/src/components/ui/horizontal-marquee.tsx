"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type HorizontalMarqueeProps = {
  children: ReactNode;
  /** Seconds for one full loop (half the duplicated track). */
  durationSeconds?: number;
  className?: string;
  trackClassName?: string;
  pauseOnHover?: boolean;
};

export function HorizontalMarquee({
  children,
  durationSeconds = 60,
  className,
  trackClassName,
  pauseOnHover = true,
}: HorizontalMarqueeProps) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (reduceMotion) {
    return (
      <div className={cn("flex gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}>
        {children}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div
        className={cn(
          "flex w-max gap-4 animate-promo-marquee",
          pauseOnHover && "hover:[animation-play-state:paused]",
          trackClassName
        )}
        style={{ "--marquee-duration": `${durationSeconds}s` } as React.CSSProperties}
      >
        <div className="flex shrink-0 gap-4">{children}</div>
        <div className="flex shrink-0 gap-4" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
