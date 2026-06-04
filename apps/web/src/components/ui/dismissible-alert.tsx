"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type DismissibleAlertVariant = "success" | "error" | "info";

const VARIANT_STYLES: Record<DismissibleAlertVariant, string> = {
  success:
    "border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950/30 dark:text-green-100",
  error: "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100",
  info: "border-border bg-muted/50 text-foreground",
};

type DismissibleAlertProps = {
  variant: DismissibleAlertVariant;
  onDismiss: () => void;
  /** Auto-close after ms. Defaults: success 6s, error 8s. Set false to disable. */
  autoDismissMs?: number | false;
  className?: string;
  children: ReactNode;
};

export function DismissibleAlert({
  variant,
  onDismiss,
  autoDismissMs,
  className,
  children,
}: DismissibleAlertProps) {
  useEffect(() => {
    if (variant !== "success" && variant !== "error") return;

    const ms =
      autoDismissMs === false
        ? null
        : autoDismissMs ?? (variant === "success" ? 6000 : 8000);

    if (ms == null) return;

    const timer = setTimeout(onDismiss, ms);
    return () => clearTimeout(timer);
  }, [variant, autoDismissMs, onDismiss]);

  return (
    <div
      role="alert"
      className={cn("relative rounded-lg border p-4 pr-10 text-sm", VARIANT_STYLES[variant], className)}
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute right-2 top-2 rounded-md p-1 text-current opacity-60 transition-opacity hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
      >
        <X className="h-4 w-4" />
      </button>
      {children}
    </div>
  );
}
