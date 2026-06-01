import { cn } from "@/lib/utils";
import { FansPumpLogo } from "@/components/brand/fans-pump-logo";

export function FansPumpBrand({
  className,
  collapsed,
}: {
  className?: string;
  collapsed?: boolean;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-2.5")}>
        <FansPumpLogo showText={!collapsed} size={collapsed ? "sm" : "md"} />
      </div>
      <p
        className={cn(
          "mt-1.5 line-clamp-1 text-sm font-medium text-muted-foreground transition-[opacity,max-height] duration-200",
          collapsed ? "pointer-events-none max-h-0 opacity-0" : "max-h-6 opacity-100"
        )}
        aria-hidden={collapsed}
      >
        Create <span className="text-primary">•</span> Discover <span className="text-primary">•</span> Verify{" "}
        <span className="text-primary">•</span> Grow
      </p>
    </div>
  );
}
