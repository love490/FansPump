"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Shield } from "lucide-react";
import { useScanner } from "@/hooks/useScanner";
import { ScanInput } from "@/components/scanner/ScanInput";
import { ScanRouter } from "@/components/scanner/ScanRouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function TrustScanPageContent() {
  const searchParams = useSearchParams();
  const { state, scan, reset } = useScanner();
  const prefilled = searchParams.get("address")?.trim() ?? "";
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    setStandalone(window.location.hostname.startsWith("trustscan."));
  }, []);

  useEffect(() => {
    if (!prefilled || state.status !== "idle") return;
    void scan(prefilled);
  }, [prefilled, scan, state.status]);

  const shell = standalone ? "min-h-screen bg-zinc-950 text-white" : "";

  return (
    <div className={cn(shell, !standalone && "mx-auto max-w-2xl px-4 py-8 sm:py-12")}>
      <div className={cn(standalone && "mx-auto max-w-2xl space-y-8 px-4 py-12")}>
        <div className="space-y-3 text-center">
          {!standalone && (
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
          )}
          <div className="space-y-1">
            <h1 className={cn("text-3xl font-bold tracking-tight", standalone && "text-white")}>
              TrustScan
            </h1>
            <p
              className={cn(
                "mx-auto max-w-md text-base font-normal leading-relaxed",
                standalone ? "text-zinc-400" : "text-muted-foreground"
              )}
            >
              On-chain intelligence for OPN Chain — analyze any token or wallet. No signup required.
            </p>
          </div>
        </div>

        <ScanInput onScan={scan} isLoading={state.status === "loading"} standalone={standalone} />

        {state.status === "loading" && (
          <div className="py-12 text-center">
            <div
              className={cn(
                "mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2",
                standalone ? "border-zinc-700 border-t-white" : "border-muted border-t-primary"
              )}
            />
            <p className={cn("text-sm", standalone ? "text-zinc-500" : "text-muted-foreground")}>
              Scanning OPN Chain…
            </p>
          </div>
        )}

        {state.status === "error" && (
          <div
            className={cn(
              "space-y-2 rounded-xl border p-4 text-center",
              standalone ? "border-red-900 bg-red-950" : "border-red-500/30 bg-red-500/10"
            )}
          >
            <p className={cn("text-sm", standalone ? "text-red-400" : "text-red-600 dark:text-red-400")}>
              {state.message}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={reset}
              className={standalone ? "text-zinc-500 hover:text-zinc-300" : undefined}
            >
              Try again
            </Button>
          </div>
        )}

        {(state.status === "token" || state.status === "wallet") && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn("px-0", standalone && "text-zinc-500 hover:text-zinc-300")}
              onClick={reset}
            >
              ← New scan
            </Button>
            <ScanRouter state={state} standalone={standalone} />
          </>
        )}
      </div>
    </div>
  );
}

export default function TrustScanPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-sm text-muted-foreground">Loading TrustScan…</div>
      }
    >
      <TrustScanPageContent />
    </Suspense>
  );
}
