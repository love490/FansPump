"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount, useBalance, useChainId } from "wagmi";
import type { Address } from "viem";
import { formatEther } from "viem";
import { ArrowDownUp, Settings2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SwapTransactionStatus } from "@/components/swap/swap-transaction-status";
import { SwapTokenPicker } from "@/components/swap/swap-token-picker";
import {
  SwapPayTokenSelect,
  OPN_PAY_TOKEN,
} from "@/components/swap/swap-pay-token-select";
import { useSwapQuote } from "@/hooks/swap/useSwapQuote";
import { useSwapApproval } from "@/hooks/swap/useSwapApproval";
import { useSwapExecute } from "@/hooks/swap/useSwapExecute";
import { useWrapOpn } from "@/hooks/swap/useWrapOpn";
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
  getBuiltinPayTokens,
  isPayTokenConfigured,
} from "@/lib/swap/constants";
import {
  isWopnToken,
} from "@/lib/swap/payment-tokens";
import { getWopnAddress } from "@/lib/chain-config/opn";
import {
  getPopularRegistryTokens,
  registryToSwapToken,
} from "@/lib/token-registry";
import { cn } from "@/lib/utils";
import { opnChain } from "@/lib/wagmi";
import { resolveTokenByAddress } from "@/lib/token-resolve";
import type { SwapTxStatus } from "@/hooks/swap/useSwapExecute";

interface SwapPanelProps {
  initialToken?: string;
  initialMode?: SwapMode;
}

const SWAP_MODES: { id: SwapMode; label: string }[] = [
  { id: "buy", label: "Buy Token" },
  { id: "sell", label: "Sell Token" },
];

function mapWrapStatus(status: string): SwapTxStatus {
  if (status === "pending") return "pending";
  if (status === "success") return "success";
  if (status === "error") return "failed";
  return "idle";
}

export function SwapPanel({ initialToken = "", initialMode = "buy" }: SwapPanelProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { openConnectModal } = useConnectModal();
  const wopnAddress = getWopnAddress();

  const [tokenAddress, setTokenAddress] = useState(initialToken);
  const [tokenSymbol, setTokenSymbol] = useState<string>("Token");
  const [mode, setMode] = useState<SwapMode>(
    initialMode === "sell" ? "sell" : "buy"
  );
  const [payToken, setPayToken] = useState<PayToken>(OPN_PAY_TOKEN);
  const [amountIn, setAmountIn] = useState("");
  const [slippage, setSlippage] = useState(DEFAULT_SLIPPAGE);
  const [gasEstimate, setGasEstimate] = useState<bigint | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  const wrongNetwork = isConnected && chainId !== opnChain.id;
  const validToken = isValidTokenAddress(tokenAddress);
  const pairSelected = validToken;

  const isAutoWrap =
    mode === "buy" && payToken.isNative && validToken && isWopnToken(tokenAddress);
  const isAutoUnwrap =
    mode === "sell" && payToken.isNative && validToken && isWopnToken(tokenAddress);
  const isWrapOrUnwrap = isAutoWrap || isAutoUnwrap;

  const swapMode = mode;

  const { quote, loading, error: quoteError } = useSwapQuote(
    tokenAddress,
    amountIn,
    swapMode,
    payToken,
    slippage,
    validToken && !isWrapOrUnwrap
  );

  const approvalToken = quote?.approvalToken as Address | undefined;
  const { allowance, approve, isPending: approving, isSuccess: approved, refetch } =
    useSwapApproval(approvalToken, address);

  const { executeSwap, estimateGas, status, error: txError, hash, reset, isBusy } =
    useSwapExecute();

  const {
    execute: executeWrap,
    status: wrapStatus,
    hash: wrapHash,
    error: wrapError,
    reset: resetWrap,
    isPending: wrapPending,
  } = useWrapOpn(wopnAddress);

  const { data: nativeBalance } = useBalance({ address });
  const { data: wopnBalance } = useBalance({ address, token: wopnAddress });

  const needsApproval =
    !isWrapOrUnwrap && !!quote?.approvalToken && allowance < (quote?.amountIn ?? 0n);

  const minReceived = quote ? applySlippage(quote.amountOut, slippage) : 0n;

  const receiveLabel = isAutoWrap
    ? "WOPN"
    : isAutoUnwrap
      ? "OPN"
      : swapMode === "buy"
        ? tokenSymbol
        : payToken.symbol;

  const receiveDecimals =
    isWrapOrUnwrap || payToken.isNative
      ? 18
      : swapMode === "buy"
        ? 18
        : quote?.paymentDecimals ?? payToken.decimals;

  const quickTokens = useMemo(
    () =>
      getPopularRegistryTokens()
        .map(registryToSwapToken)
        .filter((t): t is NonNullable<typeof t> => t !== null),
    []
  );

  const payQuickTokens = useMemo(() => getBuiltinPayTokens(), []);

  useEffect(() => {
    setTokenAddress(initialToken);
    setMode(initialMode === "sell" ? "sell" : "buy");
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

  const amountOutDisplay = useMemo(() => {
    if (isWrapOrUnwrap) {
      return amountIn && Number(amountIn) > 0 ? amountIn : "0";
    }
    if (!quote) return "0";
    return formatSwapAmount(quote.amountOut, receiveDecimals);
  }, [isWrapOrUnwrap, amountIn, quote, receiveDecimals]);

  const minReceivedDisplay = useMemo(() => {
    if (isWrapOrUnwrap) {
      return amountIn && Number(amountIn) > 0 ? `${amountIn} ${receiveLabel}` : "—";
    }
    if (!quote) return "—";
    return `${formatSwapAmount(minReceived, receiveDecimals)} ${receiveLabel}`;
  }, [isWrapOrUnwrap, amountIn, quote, minReceived, receiveDecimals, receiveLabel]);

  useEffect(() => {
    if (!quote || !address || isWrapOrUnwrap) {
      setGasEstimate(null);
      return;
    }
    estimateGas(quote, swapMode, slippage).then(setGasEstimate);
  }, [quote, address, swapMode, slippage, estimateGas, isWrapOrUnwrap]);

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

  function resetAll() {
    reset();
    resetWrap();
  }

  async function handleAction() {
    if (isAutoWrap) {
      await executeWrap("wrap", amountIn);
      return;
    }
    if (isAutoUnwrap) {
      await executeWrap("unwrap", amountIn);
      return;
    }
    if (!quote) return;
    if (needsApproval && !approved) {
      approve();
      return;
    }
    await executeSwap(quote, swapMode, slippage);
  }

  const fromSymbol = isAutoWrap
    ? "OPN"
    : isAutoUnwrap
      ? "WOPN"
      : swapMode === "buy"
        ? payToken.symbol
        : validToken
          ? tokenSymbol
          : "Token";

  const toSymbol = isAutoWrap
    ? "WOPN"
    : isAutoUnwrap
      ? "OPN"
      : swapMode === "buy"
        ? validToken
          ? tokenSymbol
          : "Token"
        : payToken.symbol;

  const fromBalance = isAutoWrap
    ? nativeBalance
    : isAutoUnwrap
      ? wopnBalance
      : swapMode === "buy" && payToken.isNative
        ? nativeBalance
        : swapMode === "sell" && validToken && isWopnToken(tokenAddress)
          ? wopnBalance
          : undefined;

  const approveLabel =
    swapMode === "buy" && !payToken.isNative ? `Approve ${payToken.symbol}` : "Approve Token";

  const actionBusy = isWrapOrUnwrap ? wrapPending : isBusy;

  const actionLabel = actionBusy
    ? "Processing…"
    : swapMode === "buy"
      ? "Buy Token"
      : "Sell Token";

  const activeStatus = isWrapOrUnwrap ? mapWrapStatus(wrapStatus) : status;
  const activeHash = isWrapOrUnwrap ? wrapHash ?? undefined : hash;
  const activeError = isWrapOrUnwrap ? wrapError : txError;

  const showPaySelect = !isWrapOrUnwrap;

  return (
    <div className="mx-auto w-full max-w-lg space-y-4">
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ArrowDownUp className="h-5 w-5 text-primary" /> Swap
              </CardTitle>
              <CardDescription>Buy and sell tokens on OPNChain — OPN ↔ WOPN wraps automatically</CardDescription>
            </div>
            {!isWrapOrUnwrap && (
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
            )}
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

          <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
            {SWAP_MODES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setMode(id);
                  resetAll();
                }}
                className={cn(
                  "rounded-md py-2 text-sm font-medium transition-colors",
                  mode === id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
            <p>
              <span className="text-muted-foreground">From:</span> <strong>{fromSymbol}</strong>
              <span className="mx-2 text-muted-foreground">→</span>
              <span className="text-muted-foreground">To:</span> <strong>{toSymbol}</strong>
            </p>
            {isWrapOrUnwrap && (
              <p className="mt-1 text-xs text-muted-foreground">
                OPN ↔ WOPN at 1:1 (wrap/unwrap)
              </p>
            )}
          </div>

          <SwapTokenPicker value={tokenAddress} onChange={setTokenAddress} />

          <div className="flex flex-wrap gap-2">
            <span className="w-full text-xs font-medium text-muted-foreground">Quick tokens</span>
            {quickTokens.map((t) => (
              <button
                key={t.contractAddress}
                type="button"
                onClick={() => {
                  setTokenAddress(t.contractAddress);
                }}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  tokenAddress.toLowerCase() === t.contractAddress.toLowerCase()
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                {t.symbol}
              </button>
            ))}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <Label className="mb-0">
                {isWrapOrUnwrap ? `Amount (${fromSymbol})` : swapMode === "buy" ? "You pay" : "You sell (tokens)"}
              </Label>
              {fromBalance && (
                <button
                  type="button"
                  onClick={() => setAmountIn(formatEther(fromBalance.value))}
                  className="text-xs text-primary hover:underline"
                >
                  Max: {Number(formatEther(fromBalance.value)).toFixed(4)} {fromSymbol}
                </button>
              )}
              {showPaySelect && swapMode === "buy" && pairSelected && (
                <SwapPayTokenSelect
                  value={payToken}
                  onChange={setPayToken}
                  excludeAddress={tokenAddress}
                />
              )}
            </div>

            {showPaySelect && swapMode === "buy" && (
              <div className="mb-2 flex flex-wrap gap-2">
                {payQuickTokens.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setPayToken(t)}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                      payToken.id === t.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                    )}
                  >
                    {t.symbol}
                  </button>
                ))}
              </div>
            )}

            <Input
              type="text"
              inputMode="decimal"
              placeholder="0.0"
              value={amountIn}
              onChange={(e) => {
                setAmountIn(e.target.value);
                resetAll();
              }}
            />
          </div>

          <div className="rounded-lg border border-dashed bg-muted/30 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">You receive</p>
              {showPaySelect && swapMode === "sell" && pairSelected && (
                <SwapPayTokenSelect
                  value={payToken}
                  onChange={setPayToken}
                  excludeAddress={tokenAddress}
                />
              )}
              {showPaySelect && swapMode === "sell" && (
                <div className="flex flex-wrap justify-end gap-1">
                  {payQuickTokens.map((t) => (
                    <button
                      key={`sell-${t.id}`}
                      type="button"
                      onClick={() => setPayToken(t)}
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
                        payToken.id === t.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                      )}
                    >
                      {t.symbol}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-2xl font-semibold tabular-nums">
              {pairSelected || isWrapOrUnwrap ? (
                <>
                  {loading && !isWrapOrUnwrap ? "…" : amountOutDisplay}{" "}
                  <span className="text-sm font-normal text-muted-foreground">{receiveLabel}</span>
                </>
              ) : (
                <span className="text-base font-normal text-muted-foreground">Select a token pair</span>
              )}
            </p>
          </div>

          {pairSelected && !isWrapOrUnwrap && (
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

          {quoteError && !isWrapOrUnwrap && <p className="text-sm text-red-600">{quoteError}</p>}

          {!isConnected ? (
            <Button className="w-full" onClick={() => openConnectModal?.()}>
              Connect Wallet
            </Button>
          ) : needsApproval && !approved ? (
            <Button className="w-full" disabled={!quote || approving || actionBusy} onClick={approve}>
              {approving ? "Approving…" : approveLabel}
            </Button>
          ) : (
            <Button
              className="w-full"
              disabled={
                !amountIn ||
                Number(amountIn) <= 0 ||
                actionBusy ||
                wrongNetwork ||
                !validToken ||
                (!isWrapOrUnwrap &&
                  (!quote || loading || !isPayTokenConfigured(payToken)))
              }
              onClick={() => void handleAction()}
            >
              {actionBusy ? "Processing…" : actionLabel}
            </Button>
          )}
        </CardContent>
      </Card>

      <SwapTransactionStatus
        status={activeStatus}
        hash={activeHash}
        error={activeError}
        onReset={resetAll}
        successLabel="Swap successful"
      />
    </div>
  );
}
