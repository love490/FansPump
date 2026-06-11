"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { TOKEN_BANNER_PLACEHOLDER } from "@/lib/token-images/constants";

type TokenBannerProps = {
  src?: string | null;
  alt?: string;
  className?: string;
  priority?: boolean;
  /** Always show banner area with fallback when src missing. */
  showFallback?: boolean;
};

const heightClass = "h-40 md:h-[220px] lg:h-[280px] xl:h-[320px]";

export function TokenBanner({
  src,
  alt = "Token banner",
  className,
  priority = false,
  showFallback = true,
}: TokenBannerProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  if (!showImage && !showFallback) return null;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-[20px] bg-muted",
        heightClass,
        className
      )}
    >
      {showImage ? (
        <Image
          src={src!}
          alt={alt}
          fill
          className="object-cover object-center"
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1200px"
          loading={priority ? undefined : "lazy"}
          priority={priority}
          onError={() => setFailed(true)}
        />
      ) : (
        <Image
          src={TOKEN_BANNER_PLACEHOLDER}
          alt=""
          fill
          className="object-cover object-center"
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1200px"
          aria-hidden
        />
      )}
    </div>
  );
}
