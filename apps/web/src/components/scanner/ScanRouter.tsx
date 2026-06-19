"use client";

import { TokenScanResult } from "@/components/scanner/TokenScanResult";
import { WalletScanResult } from "@/components/scanner/WalletScanResult";
import type { ScanState } from "@/hooks/useScanner";

export function ScanRouter({
  state,
  standalone = false,
}: {
  state: ScanState;
  standalone?: boolean;
}) {
  if (state.status === "token") {
    return <TokenScanResult result={state.result} standalone={standalone} />;
  }
  if (state.status === "wallet") {
    return <WalletScanResult result={state.result} standalone={standalone} />;
  }
  return null;
}
