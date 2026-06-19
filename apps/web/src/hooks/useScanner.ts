"use client";

import { useCallback, useState } from "react";
import { apiUrl, readApiJson } from "@/lib/api";
import type { TokenScanResult, WalletScanResult, ScanApiResponse } from "@/lib/scanner/types";

export type ScanState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "token"; result: TokenScanResult }
  | { status: "wallet"; result: WalletScanResult }
  | { status: "error"; message: string };

export function useScanner() {
  const [state, setState] = useState<ScanState>({ status: "idle" });

  const scan = useCallback(async (address: string) => {
    setState({ status: "loading" });
    try {
      const res = await fetch(apiUrl("/api/trustscan"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: address.trim() }),
      });
      const { ok, data, error } = await readApiJson<ScanApiResponse & { error?: string }>(res);
      if (!ok) throw new Error(error ?? "TrustScan failed");

      if (data.type === "token") {
        setState({ status: "token", result: data.result });
      } else {
        setState({ status: "wallet", result: data.result });
      }
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "TrustScan failed",
      });
    }
  }, []);

  const reset = useCallback(() => setState({ status: "idle" }), []);

  return { state, scan, reset };
}
