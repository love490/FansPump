"use client";

import Link from "next/link";
import { Flame, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function LiquidityLockBurnEntryCard({ className }: { className?: string }) {
  return (
    <Link href="/tools/lock" className={cn("block", className)}>
      <Card className="transition-colors hover:border-primary/40 hover:bg-muted/20">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex shrink-0 -space-x-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-background bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Lock className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-background bg-red-500/15 text-red-600 dark:text-red-400">
              <Flame className="h-4 w-4" strokeWidth={1.75} />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Lock</p>
            <p className="text-sm text-muted-foreground">
              Time-lock or burn LP from your wallet positions.
            </p>
          </div>
          <span className="shrink-0 text-sm font-semibold tracking-widest text-primary">&gt;&gt;&gt;</span>
        </CardContent>
      </Card>
    </Link>
  );
}
