"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId } from "wagmi";
import type { Address } from "viem";
import { ArrowDownUp, Settings2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SwapTransactionStatus } from "@/components/swap/swap-transaction-status";
import { SwapTokenPicker } from "@/components/swap/swap-token-picker";
import { SwapPayTokenSelect, OPN_PAY_TOKEN } from "@/components/swap/swap-pay-token-select";
import { useSwapQuote } from "@/hooks/swap/useSwapQuote";
import { useSwapApproval } from "@/hooks/swap/useSwapApproval";
import { useSwapExecute } from "@/hooks/swap/useSwapExecute";
import {
  applySlippage,
  formatSwapAmount,
  isValidTokenAddress,
} from "@/lib/swap/routerAdapter";
import {
  DEFAULT_SLIPPAGE,
  SLIPPAGE_OPTIONS,
  type PayToken,
  type SwapMode,
  isPayTokenConfigured,
} from "@/lib/swap/constants";
import { cn } from "@/lib/utils";
import { opnChain } from "@/lib/wagmi";
import { resolveTokenByAddress } from "@/lib/token-resolve";

interface SwapPanelProps {
  initialToken?: string;
  initialMode?: SwapMode;
}

export function SwapPanel({ initialToken = "", initialMode = "buy" }: SwapPanelProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { openConnectModal } = useConnectModal();
  const [tokenAddress, setTokenAddress] = useState(initialToken);
  const [tokenSymbol, setTokenSymbol] = useState<string>("Token");
  const [mode, setMode] = useState<SwapMode>(initialMode);
  const [payToken, setPayToken] = useState<PayToken>(OPN_PAY_TOKEN);
  const [amountIn, setAmountIn] = useState("");
  const [slippage, setSlippage] = useState(DEFAULT_SLIPPAGE);
  const [gasEstimate, setGasEstimate] = useState<bigint | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  const wrongNetwork = isConnected && chainId !== opnChain.id;
  const validToken = isValidTokenAddress(tokenAddress);
  const pairSelected = validToken;
  const { quote, loading, error: quoteError } = useSwapQuote(
    tokenAddress,
    amountIn,
    mode,
    payToken,
    slippage,
    validToken
  );

  const approvalToken = quote?.approvalToken as Address | undefined;
  const { allowance, approve, isPending: approving, isSuccess: approved, refetch } = useSwapApproval(
    approvalToken,
    address
  );

  const { executeSwap, estimateGas, status, error: txError, hash, reset, isBusy } = useSwapExecute();

  const needsApproval = !!quote?.approvalToken && allowance < (quote?.amountIn ?? 0n);

  const minReceived = quote ? applySlippage(quote.amountOut, slippage) : 0n;

  const receiveLabel = mode === "buy" ? tokenSymbol : payToken.symbol;
  const receiveDecimals = mode === "buy" ? 18 : quote?.paymentDecimals ?? payToken.decimals;

  useEffect(() => {
    setTokenAddress(initialToken);
    setMode(initialMode);
    setPayToken(OPN_PAY_TOKEN);
  }, [initialToken, initialMode]);

  useEffect(() => {
    if (!validToken) {
      setTokenSymbol("Token");
      return;
    }
    resolveTokenByAddress(tokenAddress).then((t) => {
      if (t) setTokenSymbol(t.symbol);
    });
  }, [tokenAddress, validToken]);

  useEffect(() => {
    if (mode === "buy" || mode === "sell") {
      setPayToken(OPN_PAY_TOKEN);
    }
  }, [mode]);

  const amountOutDisplay = useMemo(() => {
    if (!quote) return "0";
    return formatSwapAmount(quote.amountOut, receiveDecimals);
  }, [quote, receiveDecimals]);

  const minReceivedDisplay = useMemo(() => {
    if (!quote) return "—";
    return `${formatSwapAmount(minReceived, receiveDecimals)} ${receiveLabel}`;
  }, [quote, minReceived, receiveDecimals, receiveLabel]);

  useEffect(() => {
    if (!quote || !address) {
      setGasEstimate(null);
      return;
    }
    estimateGas(quote, mode, slippage).then(setGasEstimate);
  }, [quote, address, mode, slippage, estimateGas]);

  useEffect(() => {
    if (approved) refetch();
  }, [approved, refetch]);

  useEffect(() => {
    if (!settingsOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [settingsOpen]);

  async function handleSwap() {
    if (!quote) return;
    if (needsApproval && !approved) {
      approve();
      return;
    }
    await executeSwap(quote, mode, slippage);
  }

  const approveLabel =
    mode === "buy" && !payToken.isNative ? `Approve ${payToken.symbol}` : "Approve Token";

  return (
    <div className="mx-auto w-full max-w-lg space-y-4">
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ArrowDownUp className="h-5 w-5 text-primary" /> Swap
              </CardTitle>
              <CardDescription>Buy and sell tokens on OPNChain</CardDescription>
            </div>
            <div ref={settingsRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setSettingsOpen((o) => !o)}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-transparent text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground",
                  settingsOpen && "border-primary/40 bg-primary/5 text-primary"
                )}
                aria-label="Swap settings"
                aria-expanded={settingsOpen}
              >
                <Settings2 className="h-4 w-4" />
              </button>
              {settingsOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-lg border border-border/60 bg-popover/95 p-3 shadow-lg backdrop-blur-sm">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Slippage tolerance</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SLIPPAGE_OPTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSlippage(s)}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                          slippage === s
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                        )}
                      >
                        {s}%
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {wrongNetwork && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Switch to {opnChain.name} (chain {opnChain.id}) to swap.
              </span>
            </div>
          )}

          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
            {mode === "buy" ? (
              <p>
                <span className="text-muted-foreground">From:</span>{" "}
                <strong>{payToken.symbol}</strong>
                <span className="mx-2 text-muted-foreground">→</span>
                <span className="text-muted-foreground">To:</span>{" "}
                <strong>{validToken ? tokenSymbol : "Select token"}</strong>
              </p>
            ) : (
              <p>
                <span className="text-muted-foreground">From:</span>{" "}
                <strong>{validToken ? tokenSymbol : "Select token"}</strong>
                <span className="mx-2 text-muted-foreground">→</span>
                <span className="text-muted-foreground">To:</span>{" "}
                <strong>{payToken.symbol}</strong>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
            {(["buy", "sell"] as SwapMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-md py-2 text-sm font-medium capitalize transition-colors",
                  mode === m
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {m === "buy" ? "Buy Token" : "Sell Token"}
              </button>
            ))}
          </div>

          <SwapTokenPicker value={tokenAddress} onChange={setTokenAddress} />

          <div>
            {mode === "buy" ? (
              <div className="mb-2 flex items-center justify-between gap-2">
                <Label className="mb-0">You pay</Label>
                {pairSelected && (
                  <SwapPayTokenSelect
                    value={payToken}
                    onChange={setPayToken}
                    excludeAddress={tokenAddress}
                  />
                )}
              </div>
            ) : (
              <Label>You sell (tokens)</Label>
            )}
            <Input
              type="number"
              min="0"
              step="any"
              placeholder="0.0"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              className={mode === "sell" ? "mt-2" : undefined}
            />
          </div>

          <div className="rounded-lg border border-dashed bg-muted/30 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">You receive</p>
              {mode === "sell" && pairSelected && (
                <SwapPayTokenSelect
                  value={payToken}
                  onChange={setPayToken}
                  excludeAddress={tokenAddress}
                />
              )}
            </div>
            <p className="text-2xl font-semibold tabular-nums">
              {pairSelected ? (
                <>
                  {loading ? "…" : amountOutDisplay}{" "}
                  <span className="text-sm font-normal text-muted-foreground">{receiveLabel}</span>
                </>
              ) : (
                <span className="text-base font-normal text-muted-foreground">Select a token pair</span>
              )}
            </p>
          </div>

          {pairSelected && (
            <div className="space-y-2 rounded-lg border border-border/50 bg-muted/20 p-3 text-sm">
              <p className="text-xs font-medium text-muted-foreground">Trade details</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Route</span>
                <span>{quote?.routeLabel ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Router</span>
                <span className="text-right text-xs sm:text-sm">{quote?.routerLabel ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price impact</span>
                <span className={quote && quote.priceImpactBps > 300 ? "text-amber-600" : ""}>
                  {quote ? `${(quote.priceImpactBps / 100).toFixed(2)}%` : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Minimum received</span>
                <span>{quote ? minReceivedDisplay : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Est. gas</span>
                <span>{gasEstimate != null ? gasEstimate.toString() : "—"}</span>
              </div>
            </div>
          )}

          {quoteError && <p className="text-sm text-red-600">{quoteError}</p>}

          {!isConnected ? (
            <Button className="w-full" onClick={() => openConnectModal?.()}>
              Connect Wallet
            </Button>
          ) : needsApproval && !approved ? (
            <Button className="w-full" disabled={!quote || approving || isBusy} onClick={approve}>
              {approving ? "Approving…" : approveLabel}
            </Button>
          ) : (
            <Button
              className="w-full"
              disabled={
                !quote ||
                loading ||
                isBusy ||
                wrongNetwork ||
                !validToken ||
                !amountIn ||
                !isPayTokenConfigured(payToken)
              }
              onClick={handleSwap}
            >
              {isBusy ? "Processing…" : mode === "buy" ? "Buy Token" : "Sell Token"}
            </Button>
          )}
        </CardContent>
      </Card>

      <SwapTransactionStatus status={status} hash={hash} error={txError} onReset={reset} />
    </div>
  );
}
