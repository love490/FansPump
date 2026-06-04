"use client";

import { useState } from "react";
import { useAccount, useBalance, useChainId } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { RefreshCw } from "lucide-react";
import { formatEther } from "viem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { opnChainConfig, getWopnAddress } from "@/lib/chain-config/opn";
import { opnChain } from "@/lib/wagmi";
import { useWrapOpn, type WrapMode } from "@/hooks/swap/useWrapOpn";

export function WrapPanel() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { openConnectModal } = useConnectModal();
  const [mode, setMode] = useState<WrapMode>("wrap");
  const [amount, setAmount] = useState("");
  const wopnAddress = getWopnAddress();
  const wrongNetwork = isConnected && chainId !== opnChain.id;
  const { execute, status, hash, error, reset } = useWrapOpn(wopnAddress);
  const { data: nativeBalance } = useBalance({ address });
  const { data: wopnBalance } = useBalance({ address, token: wopnAddress });
  const fromBalance = mode === "wrap" ? nativeBalance : wopnBalance;
  const fromSymbol = mode === "wrap" ? "OPN" : "WOPN";
  const toSymbol = mode === "wrap" ? "WOPN" : "OPN";

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-primary" /> Wrap / Unwrap
        </CardTitle>
        <CardDescription>Convert between native OPN and WOPN at 1:1</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
          {(["wrap", "unwrap"] as WrapMode[]).map((m) => (
            <button key={m} type="button"
              onClick={() => { setMode(m); reset(); setAmount(""); }}
              className={cn("rounded-md py-2 text-sm font-medium transition-colors",
                mode === m ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}>
              {m === "wrap" ? "Wrap OPN → WOPN" : "Unwrap WOPN → OPN"}
            </button>
          ))}
        </div>

        <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
          <p>
            <span className="text-muted-foreground">From:</span> <strong>{fromSymbol}</strong>
            <span className="mx-2 text-muted-foreground">→</span>
            <span className="text-muted-foreground">To:</span> <strong>{toSymbol}</strong>
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Amount ({fromSymbol})</span>
            {fromBalance && (
              <button type="button" onClick={() => setAmount(formatEther(fromBalance.value))}
                className="text-xs text-primary hover:underline">
                Max: {Number(formatEther(fromBalance.value)).toFixed(4)} {fromSymbol}
              </button>
            )}
          </div>
          <Input type="text" inputMode="decimal" placeholder="0.0" value={amount}
            onChange={(e) => { setAmount(e.target.value); reset(); }} />
        </div>

        <div className="rounded-lg border border-dashed bg-muted/30 p-4">
          <p className="text-xs text-muted-foreground mb-1">You receive</p>
          <p className="text-2xl font-semibold tabular-nums">
            {amount && Number(amount) > 0 ? amount : "0"}{" "}
            <span className="text-sm font-normal text-muted-foreground">{toSymbol}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">1:1 — no fees</p>
        </div>

        {status === "success" && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            ✅ {mode === "wrap" ? "Wrapped" : "Unwrapped"} successfully!{" "}
            {hash && (
              <a href={`${opnChainConfig.explorerUrl}tx/${hash}`} target="_blank" rel="noopener noreferrer" className="underline">
                View tx
              </a>
            )}
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!isConnected ? (
          <Button className="w-full" onClick={() => openConnectModal?.()}>Connect Wallet</Button>
        ) : (
          <Button className="w-full"
            disabled={!amount || Number(amount) <= 0 || status === "pending" || wrongNetwork}
            onClick={() => execute(mode, amount)}>
            {status === "pending" ? "Processing…" : mode === "wrap" ? "Wrap OPN → WOPN" : "Unwrap WOPN → OPN"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}