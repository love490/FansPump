import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { usePlatformBranding } from "@/hooks/usePlatformBranding";

export function FansPumpLogo({
  className,
  href = "/",
  variant = "default",
  showText = true,
  size = "md",
  vertical = false,
  logoSrc,
}: {
  className?: string;
  href?: string;
  variant?: "default" | "light";
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  vertical?: boolean;
  logoSrc?: string;
}) {
  const { branding } = usePlatformBranding();
  const light = variant === "light";
  const iconSize = size === "sm" ? 32 : size === "lg" ? 48 : 40;
  const src = logoSrc ?? branding.logoUrl;

  return (
    <Link
      href={href}
      className={cn(
        "flex min-w-0 items-center gap-2 font-bold tracking-tight",
        vertical && "flex-col gap-2 text-center",
        className
      )}
    >
      <Image
        src={src}
        alt={branding.platformName}
        width={iconSize}
        height={iconSize}
        className="shrink-0 bg-transparent object-contain"
        priority
        unoptimized={src.startsWith("http")}
      />
      {showText && (
        <span className={cn("text-xl", size === "lg" && "text-2xl", size === "md" && "text-lg")}>
          <span className={light ? "text-white" : "text-foreground"}>Fans</span>
          <span className={light ? "text-iopn-300" : "text-primary"}>Pump</span>
        </span>
      )}
    </Link>
  );
}
