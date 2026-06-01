import { cn } from "@/lib/utils";
import { FansPumpLogo } from "@/components/brand/fans-pump-logo";

const TAGLINE_PARTS = ["Create", "Discover", "Verify", "Grow"] as const;

export function FansPumpTagline({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "flex w-full min-w-0 flex-nowrap items-center gap-1 text-[11px] font-medium leading-none text-foreground/85",
        className
      )}
    >
      {TAGLINE_PARTS.map((word, i) => (
        <span key={word} className="inline-flex shrink-0 items-center gap-1">
          {i > 0 && <span className="text-primary" aria-hidden="true">•</span>}
          <span>{word}</span>
        </span>
      ))}
    </p>
  );
}

export function FansPumpBrand({
  className,
  collapsed,
  showTagline = true,
}: {
  className?: string;
  collapsed?: boolean;
  showTagline?: boolean;
}) {
  if (collapsed) {
    return (
      <div className={cn("flex justify-center", className)}>
        <FansPumpLogo showText={false} size="sm" />
      </div>
    );
  }

  return (
    <div className={cn("min-w-0", className)}>
      <FansPumpLogo showText size="md" />
      {showTagline && <FansPumpTagline className="mt-2" />}
    </div>
  );
}
