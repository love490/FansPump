"use client";

import { cn } from "@/lib/utils";

export function AnalyticsStatCard({
  label,
  value,
  change,
  changePeriod,
  className,
}: {
  label: string;
  value: string;
  change?: number | null;
  changePeriod?: string;
  className?: string;
}) {
  const hasChange = change != null && Number.isFinite(change);
  const positive = (change ?? 0) >= 0;

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 shadow-sm", className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">{value}</p>
      {hasChange && (
        <p
          className={cn(
            "mt-1 text-xs font-medium tabular-nums",
            positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          )}
        >
          {positive ? "+" : ""}
          {change}% {changePeriod ?? "vs prior"}
        </p>
      )}
    </div>
  );
}

export function AnalyticsSection({
  id,
  title,
  description,
  children,
  action,
}: {
  id?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function AnalyticsEmpty({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
