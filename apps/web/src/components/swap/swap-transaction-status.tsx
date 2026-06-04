"use client";

import Link from "next/link";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
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

  if (status === "pending" || status === "confirming") {
    return (
      <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm">
        <div className="flex items-center gap-2 font-medium">
          <Loader2 className="h-4 w-4 animate-spin" />
          {status === "pending" ? "Pending…" : "Confirming…"}
        </div>
      </div>
    );
  }

  const handleDismiss = () => onReset?.();

  if (status === "success") {
    return (
      <DismissibleAlert variant="success" onDismiss={handleDismiss}>
        <div className="flex items-center gap-2 font-medium">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          Swap successful
        </div>
        {hash && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={getExplorerTxUrl(hash)} target="_blank" rel="noopener noreferrer">
                View transaction
              </Link>
            </Button>
            {onReset && (
              <Button variant="ghost" size="sm" onClick={handleDismiss}>
                New swap
              </Button>
            )}
          </div>
        )}
      </DismissibleAlert>
    );
  }

  return (
    <DismissibleAlert variant="error" onDismiss={handleDismiss}>
      <div className="flex items-center gap-2 font-medium">
        <XCircle className="h-4 w-4 text-red-600" />
        Swap failed
      </div>
      {error && <p className="mt-2 opacity-90">{error}</p>}
      {hash && (
        <div className="mt-3">
          <Button asChild variant="outline" size="sm">
            <Link href={getExplorerTxUrl(hash)} target="_blank" rel="noopener noreferrer">
              View transaction
            </Link>
          </Button>
        </div>
      )}
    </DismissibleAlert>
  );
}
