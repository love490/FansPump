"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { TOKEN_LOGO_PLACEHOLDER } from "@/lib/token-images/constants";

function sparklinePath(seed: string, width: number, height: number): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const points: string[] = [];
  const steps = 12;
  for (let i = 0; i <= steps; i++) {
    hash = (hash * 1103515245 + 12345) >>> 0;
    const x = (i / steps) * width;
    const y = height - ((hash % 100) / 100) * height * 0.85 - height * 0.08;
    points.push(`${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return points.join(" ");
}

function CardSparkline({ seed }: { seed: string }) {
  const filterId = useMemo(() => `spark-glow-${seed.slice(2, 10)}`, [seed]);
  const d = useMemo(() => sparklinePath(seed, 120, 36), [seed]);
  return (
    <svg
      viewBox="0 0 120 36"
      className="h-9 w-[120px] overflow-visible"
      aria-hidden
    >
      <defs>
        <filter id={filterId}>
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d={d}
        fill="none"
        stroke="#4ade80"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${filterId})`}
      />
    </svg>
  );
}

type TokenCardHeroProps = {
  logoUrl?: string | null;
  symbol: string;
  name: string;
  seed: string;
  priority?: boolean;
};

export function TokenCardHero({ logoUrl, symbol, name, seed, priority }: TokenCardHeroProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(logoUrl) && !failed;
  const initials = symbol?.trim().slice(0, 2).toUpperCase() || "FP";

  return (
    <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-muted">
      {showImage ? (
        <Image
          src={logoUrl!}
          alt={`${name} logo`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 45vw, (max-width: 1024px) 30vw, 280px"
          loading={priority ? undefined : "lazy"}
          priority={priority}
          onError={() => setFailed(true)}
        />
      ) : (
        <>
          <Image
            src={TOKEN_LOGO_PLACEHOLDER}
            alt=""
            fill
            className="object-cover opacity-40"
            sizes="280px"
            aria-hidden
          />
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1E5BFF]/30 via-background/80 to-background">
            <span className="text-4xl font-black tracking-tight text-white/90 sm:text-5xl">
              {initials}
            </span>
          </div>
        </>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />

      <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3">
        <CardSparkline seed={seed} />
      </div>
    </div>
  );
}

export function CreatorAvatar({
  username,
  address,
  className,
}: {
  username?: string | null;
  address?: string;
  className?: string;
}) {
  const label =
    username?.trim().slice(0, 1).toUpperCase() ??
    address?.slice(2, 4).toUpperCase() ??
    "?";

  return (
    <div
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-foreground ring-1 ring-border",
        className
      )}
      title={username ?? address}
    >
      {label}
    </div>
  );
}
