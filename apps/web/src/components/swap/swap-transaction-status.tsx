"use client";

import Link from "next/link";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getExplorerTxUrl } from "@/lib/swap/routerAdapter";
import type { SwapTxStatus } from "@/hooks/swap/useSwapExecute";

interface SwapTransactionStatusProps {
  status: SwapTxStatus;
  hash?: string;
  error?: string | null;
  onReset?: () => void;
}

export function SwapTransactionStatus({ status, hash, error, onReset }: SwapTransactionStatusProps) {
  if (status === "idle") return null;

  return (
    <div
      className={`rounded-lg border p-4 text-sm ${
        status === "success"
          ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30"
          : status === "failed"
            ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
            : "border-border bg-muted/50"
      }`}
    >
      <div className="flex items-center gap-2 font-medium">
        {(status === "pending" || status === "confirming") && (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> {status === "pending" ? "Pending…" : "Confirming…"}
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="h-4 w-4 text-green-600" /> Swap successful
          </>
        )}
        {status === "failed" && (
          <>
            <XCircle className="h-4 w-4 text-red-600" /> Swap failed
          </>
        )}
      </div>
      {error && <p className="mt-2 text-muted-foreground">{error}</p>}
      {hash && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={getExplorerTxUrl(hash)} target="_blank" rel="noopener noreferrer">
              View transaction
            </Link>
          </Button>
          {onReset && (
            <Button variant="ghost" size="sm" onClick={onReset}>
              New swap
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
