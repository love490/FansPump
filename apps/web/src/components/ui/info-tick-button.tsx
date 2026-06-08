"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type InfoTickVariant = "success" | "warning" | "danger" | "muted" | "primary";

const variantButtonClasses: Record<InfoTickVariant, string> = {
  success:
    "border-green-300 bg-green-100 text-green-600 hover:bg-green-200 dark:border-green-800 dark:bg-green-950 dark:text-green-400 dark:hover:bg-green-900",
  warning:
    "border-amber-300 bg-amber-100 text-amber-600 hover:bg-amber-200 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400 dark:hover:bg-amber-900",
  danger:
    "border-red-300 bg-red-100 text-red-600 hover:bg-red-200 dark:border-red-800 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900",
  muted: "border-border bg-muted/40 text-muted-foreground hover:bg-muted",
  primary: "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20",
};

const variantIconClasses: Record<InfoTickVariant, string> = {
  success: "text-green-600 dark:text-green-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-red-600 dark:text-red-400",
  muted: "text-muted-foreground",
  primary: "text-primary",
};

type InfoTickButtonProps = {
  "aria-label": string;
  onClick: () => void;
  variant?: InfoTickVariant;
  size?: "sm" | "md";
  className?: string;
  iconClassName?: string;
};

/** Round info button with a colourable check tick (inherits variant colour via text-current). */
export function InfoTickButton({
  "aria-label": ariaLabel,
  onClick,
  variant = "muted",
  size = "sm",
  className,
  iconClassName,
}: InfoTickButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border transition-colors",
        size === "sm" ? "h-5 w-5" : "h-8 w-8",
        variantButtonClasses[variant],
        className
      )}
    >
      <Check
        className={cn(
          "text-current",
          size === "sm" ? "h-3 w-3" : "h-4 w-4",
          iconClassName
        )}
      />
    </button>
  );
}

/** Inline colourable tick icon (e.g. next to “No tax” copy). */
export function InfoTickIcon({
  variant = "success",
  className,
}: {
  variant?: InfoTickVariant;
  className?: string;
}) {
  return (
    <Check
      className={cn("shrink-0", variantIconClasses[variant], className)}
      aria-hidden
    />
  );
}
