"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { TOKEN_LOGO_PLACEHOLDER } from "@/lib/token-images/constants";

type TokenLogoProps = {
  src?: string | null;
  symbol: string;
  name?: string;
  /** Responsive launchpad sizes (56→72px). Use `fixed` for compact UI (swap/search). */
  layout?: "responsive" | "fixed";
  /** Used when layout is `fixed` (px). */
  size?: number;
  className?: string;
  priority?: boolean;
};

const responsiveSizeClass =
  "h-14 w-14 md:h-[60px] md:w-[60px] lg:h-16 lg:w-16 xl:h-[72px] xl:w-[72px]";

export function TokenLogo({
  src,
  symbol,
  name,
  layout = "responsive",
  size = 40,
  className,
  priority = false,
}: TokenLogoProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  const label = name ?? symbol;

  const boxStyle = layout === "fixed" ? { width: size, height: size } : undefined;

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-xl bg-muted aspect-square",
        layout === "responsive" && responsiveSizeClass,
        className
      )}
      style={boxStyle}
    >
      {showImage ? (
        <Image
          src={src!}
          alt={`${label} logo`}
          fill
          className="object-cover"
          sizes={
            layout === "fixed"
              ? `${size}px`
              : "(max-width: 768px) 56px, (max-width: 1024px) 60px, (max-width: 1280px) 64px, 72px"
          }
          loading={priority ? undefined : "lazy"}
          priority={priority}
          onError={() => setFailed(true)}
        />
      ) : (
        <TokenLogoFallback symbol={symbol} />
      )}
    </div>
  );
}

function TokenLogoFallback({ symbol }: { symbol: string }) {
  const initials = symbol?.trim().slice(0, 2).toUpperCase() || "FP";

  return (
    <div className="relative h-full w-full">
      <Image
        src={TOKEN_LOGO_PLACEHOLDER}
        alt=""
        fill
        className="object-cover"
        sizes="72px"
        aria-hidden
      />
      <div className="absolute inset-0 flex items-center justify-center bg-[#0f42a8]/80 text-sm font-bold text-white sm:text-base">
        {initials}
      </div>
    </div>
  );
}
