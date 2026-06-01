import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function FansPumpLogo({
  className,
  href = "/",
  variant = "default",
  showText = true,
  size = "md",
  vertical = false,
}: {
  className?: string;
  href?: string;
  variant?: "default" | "light";
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  vertical?: boolean;
}) {
  const light = variant === "light";
  const iconSize = size === "sm" ? 32 : size === "lg" ? 48 : 40;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 font-bold tracking-tight",
        vertical && "flex-col gap-2 text-center",
        className
      )}
    >
      <Image
        src="/images/logo.png"
        alt="FansPump"
        width={iconSize}
        height={iconSize}
        className="shrink-0"
        priority
      />
      {showText && (
        <span className={cn("text-xl", size === "lg" && "text-2xl")}>
          <span className={light ? "text-white" : "text-foreground"}>Fans</span>
          <span className={light ? "text-iopn-300" : "text-primary"}>Pump</span>
        </span>
      )}
    </Link>
  );
}
