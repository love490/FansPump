"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { formatTaxBps } from "@/lib/utils";
import { InfoTickButton, InfoTickIcon } from "@/components/ui/info-tick-button";

type TokenTaxBadgeProps = {
  buyTaxBps?: number | null;
  sellTaxBps?: number | null;
  taxEnabled: boolean;
};

export function TokenTaxBadge({ buyTaxBps, sellTaxBps, taxEnabled }: TokenTaxBadgeProps) {
  const [infoOpen, setInfoOpen] = useState(false);

  if (taxEnabled && buyTaxBps != null && sellTaxBps != null) {
    return (
      <div className="inline-flex flex-col gap-1 rounded-full border border-red-200/80 bg-red-50/50 px-3 py-1.5 text-sm dark:border-red-900/50 dark:bg-red-950/30">
        <span className="inline-flex items-center gap-1.5">
          <span className="font-medium text-foreground">Tax</span>
          <button
            type="button"
            onClick={() => setInfoOpen((o) => !o)}
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-red-300 bg-red-100 text-red-600 hover:bg-red-200 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
            aria-label="Tax info"
          >
            <AlertCircle className="h-3 w-3" />
          </button>
        </span>
        {infoOpen && (
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-600" />
            <span>Buy {formatTaxBps(buyTaxBps)}</span>
            <span>·</span>
            <span>Sell {formatTaxBps(sellTaxBps)}</span>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="inline-flex flex-col gap-1 rounded-full border border-green-200/80 bg-green-50/50 px-3 py-1.5 text-sm dark:border-green-900/50 dark:bg-green-950/30">
      <span className="inline-flex items-center gap-1.5">
        <span className="font-medium text-foreground">Tax</span>
        <InfoTickButton
          aria-label="Tax info"
          variant="success"
          onClick={() => setInfoOpen((o) => !o)}
        />
      </span>
      {infoOpen && (
        <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-300">
          <InfoTickIcon variant="success" className="h-3.5 w-3.5" />
          No tax
        </span>
      )}
    </div>
  );
}
