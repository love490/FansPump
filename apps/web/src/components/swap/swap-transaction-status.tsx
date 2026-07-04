"use client";

import Link from "next/link";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { getExplorerTxUrl } from "@/lib/swap/routerAdapter";
import { formatContractError } from "@/lib/contract-errors";
import type { SwapTxStatus } from "@/hooks/swap/useSwapExecute";

interface SwapTransactionStatusProps {
  status: SwapTxStatus;
  hash?: string;
  error?: string | null;
  onReset?: () => void;
  successLabel?: string;
}

function TransactionFailedAlert({
  title,
  reason,
  hash,
  onDismiss,
}: {
  title: string;
  reason: string;
  hash?: string;
  onDismiss: () => void;
}) {
  return (
    <DismissibleAlert variant="error" onDismiss={onDismiss} className="border-l-4 border-l-red-500 pl-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
          <XCircle className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1 pr-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">{title}</p>
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              Failed
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{reason}</p>
          {hash && (
            <div className="mt-3">
              <Button asChild variant="outline" size="sm">
                <Link href={getExplorerTxUrl(hash)} target="_blank" rel="noopener noreferrer">
                  View transaction
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </DismissibleAlert>
  );
}

export function SwapTransactionStatus({
  status,
  hash,
  error,
  onReset,
  successLabel = "Swap successful",
}: SwapTransactionStatusProps) {
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
          {successLabel}
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

  const reason = error ? formatContractError(error) : "Something went wrong. Try again.";

  return (
    <TransactionFailedAlert
      title="Swap failed"
      reason={reason}
      hash={hash}
      onDismiss={handleDismiss}
    />
  );
}

export { TransactionFailedAlert };
