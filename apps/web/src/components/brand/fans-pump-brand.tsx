import { cn } from "@/lib/utils";
import { FansPumpLogo } from "@/components/brand/fans-pump-logo";

export function FansPumpBrand({
  className,
  collapsed,
}: {
  className?: string;
  collapsed?: boolean;
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
      <FansPumpLogo size="md" />
      <p className="mt-2.5 whitespace-nowrap text-sm font-medium text-muted-foreground">
        Create <span className="text-primary">•</span> Discover <span className="text-primary">•</span> Verify{" "}
        <span className="text-primary">•</span> Grow
      </p>
    </div>
  );
}
