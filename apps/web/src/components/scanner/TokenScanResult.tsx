"use client";

import Link from "next/link";
import { TrustBadge } from "@/components/trust/TrustBadge";
import { TrustScoreBar } from "@/components/trust/TrustScoreBar";
import { RiskFlag } from "@/components/scanner/RiskFlag";
import { AddressCopyButton } from "@/components/ui/address-copy-button";
import { riskLevelToTrustTier, type TokenScanResult } from "@/lib/scanner/types";
import { cn, shortenAddress } from "@/lib/utils";

export function TokenScanResult({
  result,
  standalone = false,
}: {
  result: TokenScanResult;
  standalone?: boolean;
}) {
  const tier = riskLevelToTrustTier(result.riskLevel);
  const card = standalone ? "rounded-xl border border-zinc-800 bg-zinc-900 p-4" : "rounded-xl border border-border bg-card p-4";
  const cardPanel = standalone
    ? "space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
    : "space-y-4 rounded-2xl border border-border bg-card p-5";
  const muted = standalone ? "text-zinc-500" : "text-muted-foreground";
  const title = standalone ? "text-white" : undefined;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h2 className={cn("text-xl font-bold", title)}>{result.name}</h2>
            <span className={cn("text-sm", muted)}>{result.symbol}</span>
            {result.isFansPumpToken && (
              <span className="rounded-full border border-violet-800 bg-violet-950 px-2 py-0.5 text-xs text-violet-400">
                FansPump
              </span>
            )}
          </div>
          <div className="flex min-w-0 items-center gap-0.5">
            <span className={cn("truncate font-mono text-xs", muted)} title={result.address}>
              {shortenAddress(result.address, 6)}
            </span>
            <AddressCopyButton
              value={result.address}
              className={cn("h-6 w-6", standalone && "hover:bg-zinc-800")}
            />
          </div>
        </div>
        <TrustBadge tier={tier} score={result.trustScore} size="lg" />
      </div>

      <div className={cardPanel}>
        <p className={cn("text-xs font-medium uppercase tracking-wider", muted)}>Score breakdown</p>
        <TrustScoreBar label="Contract Safety" score={result.contractSafety.score} weight={0.4} colorClass="bg-violet-500" />
        <TrustScoreBar label="Liquidity Safety" score={result.liquiditySafety.score} weight={0.35} colorClass="bg-blue-500" />
        <TrustScoreBar label="Market Integrity" score={result.marketIntegrity.score} weight={0.25} colorClass="bg-cyan-500" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Holders", value: result.marketIntegrity.holders.toLocaleString() },
          { label: "Top 10 hold", value: `${result.marketIntegrity.top10HolderPercent}%` },
          {
            label: "Liquidity",
            value: result.liquiditySafety.hasLiquidity
              ? `$${result.liquiditySafety.liquidityUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
              : "None",
          },
          {
            label: "Source code",
            value: result.contractSafety.sourceVerified ? "✓ Verified" : "✗ Unverified",
            color: result.contractSafety.sourceVerified ? "text-emerald-400" : "text-red-400",
          },
        ].map((s) => (
          <div key={s.label} className={card}>
            <p className={cn("mb-1 text-xs", muted)}>{s.label}</p>
            <p className={cn("font-bold", "color" in s ? s.color : standalone ? "text-white" : undefined)}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {result.riskFlags.length > 0 && (
        <div className="space-y-2">
          <p className={cn("text-sm font-medium", muted)}>Risk flags ({result.riskFlags.length})</p>
          {result.riskFlags.map((f) => (
            <RiskFlag key={f.id} flag={f} />
          ))}
        </div>
      )}

      {result.deployer && (
        <div className={card}>
          <p className={cn("mb-1 text-xs", muted)}>Deployed by</p>
          <Link href={`/trustscan?address=${result.deployer}`} className="break-all font-mono text-xs text-primary hover:underline">
            {result.deployer}
          </Link>
          {result.deployerRisk !== "UNKNOWN" && (
            <p
              className={cn(
                "mt-1.5 text-xs font-medium",
                result.deployerRisk === "DANGER" && "text-red-400",
                result.deployerRisk === "CAUTION" && "text-yellow-400",
                result.deployerRisk === "SAFE" && "text-emerald-400"
              )}
            >
              Deployer risk: {result.deployerRisk}
            </p>
          )}
        </div>
      )}

      {!standalone && (
        <Link href={`/token/${result.address}`} className="text-sm text-primary hover:underline">
          View token page →
        </Link>
      )}
    </div>
  );
}
