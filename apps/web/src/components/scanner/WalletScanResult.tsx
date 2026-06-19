"use client";

import Link from "next/link";
import { RiskFlag } from "@/components/scanner/RiskFlag";
import { AddressCopyButton } from "@/components/ui/address-copy-button";
import type { WalletScanResult } from "@/lib/scanner/types";
import { cn, shortenAddress } from "@/lib/utils";

export function WalletScanResult({
  result,
  standalone = false,
}: {
  result: WalletScanResult;
  standalone?: boolean;
}) {
  const riskColor =
    result.riskLevel === "DANGER"
      ? "text-red-400"
      : result.riskLevel === "CAUTION"
        ? "text-yellow-400"
        : "text-emerald-400";
  const muted = standalone ? "text-zinc-500" : "text-muted-foreground";
  const text = standalone ? "text-white" : undefined;
  const rowClass = standalone
    ? "flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3 transition-colors hover:bg-zinc-800/80"
    : "flex items-center justify-between gap-3 p-3 transition-colors hover:bg-muted/30";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("mb-1 text-xs", muted)}>Wallet — OPN Chain</p>
          <div className="flex min-w-0 items-center gap-0.5">
            <span className={cn("truncate font-mono text-xs", text ?? muted)} title={result.address}>
              {shortenAddress(result.address, 6)}
            </span>
            <AddressCopyButton
              value={result.address}
              className={cn("h-6 w-6", standalone && "hover:bg-zinc-800")}
            />
          </div>
          <div className={cn("mt-1.5 flex items-center gap-3 text-xs", muted)}>
            <span>{Number(result.nativeBalance).toFixed(4)} OPN</span>
            <span>{result.txCount.toLocaleString()} transactions</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className={cn("text-3xl font-bold tabular-nums", riskColor)}>{result.riskScore}</p>
          <p className={cn("mt-0.5 text-xs", riskColor)}>{result.riskLevel} risk</p>
        </div>
      </div>

      {result.riskFlags.length > 0 && (
        <div className="space-y-2">
          <p className={cn("text-sm font-medium", muted)}>Risk flags ({result.riskFlags.length})</p>
          {result.riskFlags.map((f) => (
            <RiskFlag key={f.id} flag={f} />
          ))}
        </div>
      )}

      {result.deployedTokens.length > 0 && (
        <div>
          <p className={cn("mb-3 text-sm font-medium", muted)}>
            Deployed contracts ({result.totalDeployed})
          </p>
          <div className={standalone ? "space-y-2" : "divide-y divide-border overflow-hidden rounded-xl border border-border"}>
            {result.deployedTokens.map((t) => (
              <Link key={t.address} href={`/trustscan?address=${t.address}`} className={rowClass}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("text-sm font-medium", text)}>{t.name}</span>
                    <span className={cn("text-xs", muted)}>{t.symbol}</span>
                    {t.status === "rugged" && (
                      <span className="rounded-full border border-red-900 bg-red-950 px-1.5 py-0.5 text-xs text-red-400">
                        Rugged
                      </span>
                    )}
                    {t.isFansPumpToken && (
                      <span className="rounded-full border border-violet-800 bg-violet-950 px-1.5 py-0.5 text-xs text-violet-400">
                        FansPump
                      </span>
                    )}
                  </div>
                  <p className={cn("mt-0.5 truncate font-mono text-xs", standalone ? "text-zinc-700" : muted)}>
                    {t.address}
                  </p>
                </div>
                {t.currentTrustScore !== null && (
                  <span
                    className={cn(
                      "shrink-0 text-sm font-bold tabular-nums",
                      t.currentTrustScore >= 70 && "text-emerald-400",
                      t.currentTrustScore >= 40 && t.currentTrustScore < 70 && "text-yellow-400",
                      t.currentTrustScore < 40 && "text-red-400"
                    )}
                  >
                    {t.currentTrustScore}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {result.connectedWallets.length > 0 && (
        <div>
          <p className={cn("mb-3 text-sm font-medium", muted)}>
            Linked wallets ({result.connectedWallets.length})
          </p>
          <div className="space-y-2">
            {result.connectedWallets.map((w) => (
              <div
                key={w.address}
                className={cn(
                  "rounded-xl border p-3",
                  standalone ? "border-zinc-800 bg-zinc-900" : "border-border bg-card"
                )}
              >
                <div className="mb-1 flex items-center justify-between">
                  <Link href={`/trustscan?address=${w.address}`} className="truncate font-mono text-xs text-primary hover:underline">
                    {w.address}
                  </Link>
                  <span className={cn("ml-2 shrink-0 text-xs font-medium", w.riskLevel === "DANGER" ? "text-red-400" : "text-yellow-400")}>
                    {Math.round(w.confidence * 100)}% match
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {w.signals.map((s, i) => (
                    <span key={i} className={cn("rounded-full px-2 py-0.5 text-xs", standalone ? "bg-zinc-800 text-zinc-600" : "bg-muted text-muted-foreground")}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!standalone && (
        <Link href={`/creator/${result.address}`} className="text-sm text-primary hover:underline">
          View creator profile →
        </Link>
      )}
    </div>
  );
}
