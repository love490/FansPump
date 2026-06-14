"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { TOKEN_LOGO_PLACEHOLDER } from "@/lib/token-images/constants";
import { tokenCardHeroClass } from "@/components/tokens/token-card-styles";

type TokenCardHeroProps = {
  logoUrl?: string | null;
  symbol: string;
  name: string;
  priority?: boolean;
};

export function TokenCardHero({ logoUrl, symbol, name, priority }: TokenCardHeroProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(logoUrl) && !failed;
  const initials = symbol?.trim().slice(0, 2).toUpperCase() || "FP";

  return (
    <div className={tokenCardHeroClass}>
      {showImage ? (
        <Image
          src={logoUrl!}
          alt={`${name} logo`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 40vw, (max-width: 1024px) 25vw, 240px"
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
            sizes="240px"
            aria-hidden
          />
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1E5BFF]/30 via-background/80 to-background">
            <span className="text-3xl font-black tracking-tight text-white/90 sm:text-4xl">
              {initials}
            </span>
          </div>
        </>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/40 to-transparent" />
    </div>
  );
}

export function CreatorAvatar({
  username,
  address,
  imageUrl,
  className,
}: {
  username?: string | null;
  address?: string;
  imageUrl?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [imageUrl]);

  const label =
    username?.trim().slice(0, 1).toUpperCase() ??
    address?.slice(2, 4).toUpperCase() ??
    "?";
  const title = username ?? address;

  if (imageUrl && !failed) {
    return (
      <Image
        src={imageUrl}
        alt={title ? `${title} profile` : "Creator profile"}
        width={20}
        height={20}
        className={cn(
          "h-5 w-5 shrink-0 rounded-full object-cover ring-1 ring-border",
          className
        )}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-foreground ring-1 ring-border",
        className
      )}
      title={title}
    >
      {label}
    </div>
  );
}
