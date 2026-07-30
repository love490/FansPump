"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink, Flame, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useWalletLiquidityHistory } from "@/hooks/dashboard/useWalletLiquidityHistory";
import { formatLiquidityAmountFromWei } from "@/lib/liquidity/format-amount";
import { explorerTxUrl } from "@/lib/explorer";
import { cn, shortenAddress } from "@/lib/utils";

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

function formatLpAmount(raw: string): string {
  try {
    return formatLiquidityAmountFromWei(BigInt(raw), 18);
  } catch {
    return "0";
  }
}

function TxLink({ hash }: { hash?: string | null }) {
  if (!hash) return <span className="text-xs text-muted-foreground">No tx recorded</span>;
  return (
    <a
      href={explorerTxUrl(hash)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
    >
      View on explorer
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

function CollapsibleSection({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="overflow-hidden rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left transition-colors hover:bg-muted/30"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
          <Badge variant="secondary">{count}</Badge>
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && <div className="divide-y divide-border border-t border-border">{children}</div>}
    </section>
  );
}

export function DashboardLockBurnHistory({
  walletAddress,
}: {
  walletAddress: string | undefined;
}) {
  const { locks, burns, totals, loading } = useWalletLiquidityHistory(walletAddress);

  if (!walletAddress) return null;
  if (loading && locks.length === 0 && burns.length === 0) {
    return <p className="text-sm text-muted-foreground">Loading locks and burns…</p>;
  }
  if (locks.length === 0 && burns.length === 0) return null;

  return (
    <div className="space-y-3">
      {locks.length > 0 && (
        <CollapsibleSection
          title="Token locks"
          icon={<Lock className="h-4 w-4 text-primary" />}
          count={locks.length}
        >
          {locks.map((lock) => (
            <div key={lock.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {lock.token?.symbol ?? shortenAddress(lock.tokenAddress, 4)} LP
                </p>
                <p className="text-sm tabular-nums text-muted-foreground">
                  {formatLpAmount(lock.amount)} LP · locked {formatDate(lock.createdAt)} · unlocks{" "}
                  {formatDate(lock.unlockAt)}
                </p>
                <TxLink hash={lock.txHash} />
              </div>
              <Badge variant={lock.status === "LOCKED" ? "default" : "outline"}>
                {lock.status === "LOCKED" ? "Locked" : "Unlocked"}
              </Badge>
            </div>
          ))}
          <div className="bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            {totals.activeLocks} active · {formatLpAmount(totals.lockedAmount)} LP locked in total
          </div>
        </CollapsibleSection>
      )}

      {burns.length > 0 && (
        <CollapsibleSection
          title="Burn history"
          icon={<Flame className="h-4 w-4 text-orange-500" />}
          count={burns.length}
        >
          {burns.map((burn) => (
            <div key={burn.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {burn.token?.symbol ?? shortenAddress(burn.tokenAddress, 4)} LP
                </p>
                <p className="text-sm tabular-nums text-muted-foreground">
                  {formatLpAmount(burn.amount)} LP burned {formatDate(burn.burnedAt)}
                </p>
                <TxLink hash={burn.txHash} />
              </div>
              <Badge variant="outline">{shortenAddress(burn.burnAddress, 4)}</Badge>
            </div>
          ))}
          <div className="bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            {formatLpAmount(totals.burnedAmount)} LP burned in total
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}
