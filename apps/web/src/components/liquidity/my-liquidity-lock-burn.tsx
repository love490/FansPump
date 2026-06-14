"use client";

import Link from "next/link";
import { Flame, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MyLiquidityPosition } from "@/hooks/liquidity/useMyLiquidityPositions";

function LockBurnCard({
  href,
  label,
  title,
  description,
  icon: Icon,
  accent,
}: {
  href: string;
  label: string;
  title: string;
  description: string;
  icon: typeof Flame;
  accent: "burn" | "lock";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative block overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all",
        "hover:border-primary/40 hover:shadow-[0_0_28px_rgba(30,91,255,0.12)]"
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80",
          accent === "burn"
            ? "from-red-500/10 via-orange-500/5 to-transparent"
            : "from-amber-500/15 via-primary/10 to-transparent"
        )}
      />
      <div className="relative flex min-h-[9rem] flex-col">
        <div className="flex items-start justify-between gap-3">
          <span
            className={cn(
              "inline-flex rounded-xl p-2.5",
              accent === "burn"
                ? "bg-red-500/15 text-red-600 dark:text-red-400"
                : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <span className="shrink-0 rounded-full border border-border bg-background/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </div>
        <p className="mt-4 text-lg font-extrabold tracking-tight text-foreground">{title}</p>
        <p className="mt-2 text-sm font-medium text-muted-foreground">{description}</p>
        <span className="mt-auto pt-4 text-sm font-semibold tracking-widest text-primary transition-transform group-hover:translate-x-0.5">
          &gt;&gt;&gt;
        </span>
      </div>
    </Link>
  );
}

export function MyLiquidityLockBurn({ positions }: { positions: MyLiquidityPosition[] }) {
  const active = positions.filter((p) => !p.pending && p.lpBalance > 0n);

  if (active.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lock &amp; burn</CardTitle>
        <CardDescription>
          Secure LP you hold as a creator — open manage liquidity to lock or burn tokens.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {active.map((p) => (
          <div key={`${p.tokenAddress}:${p.pairId}`} className="space-y-3">
            <p className="text-sm font-semibold">
              {p.tokenSymbol} / {p.pairLabel}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <LockBurnCard
                href={`/liquidity/${p.tokenAddress}?pair=${p.pairId}#lock`}
                label="Lock"
                title="Lock LP"
                description="Time-lock LP in the on-chain locker contract."
                icon={Lock}
                accent="lock"
              />
              <LockBurnCard
                href={`/liquidity/${p.tokenAddress}?pair=${p.pairId}#burn`}
                label="Burn"
                title="Burn LP"
                description="Permanently send LP to your unique burn wallet."
                icon={Flame}
                accent="burn"
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
