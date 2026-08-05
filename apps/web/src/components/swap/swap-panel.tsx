"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount, useBalance, useReadContract } from "wagmi";
import type { Address } from "viem";
import { formatEther, formatUnits } from "viem";
import { ArrowDownUp, Settings2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SwapTransactionStatus } from "@/components/swap/swap-transaction-status";
import { SwapTokenPicker } from "@/components/swap/swap-token-picker";
import { SwapPayTokenSelect, OPN_PAY_TOKEN } from "@/components/swap/swap-pay-token-select";
import { useSwapQuote } from "@/hooks/swap/useSwapQuote";
import { useSwapApproval } from "@/hooks/swap/useSwapApproval";
import { useSwapExecute } from "@/hooks/swap/useSwapExecute";
import { useWrapOpn } from "@/hooks/swap/useWrapOpn";
import {
  applySlippage,
  formatSwapAmount,
  isValidTokenAddress,
} from "@/lib/swap/routerAdapter";
import { erc20Abi } from "@/lib/swap/abis";
import {
  DEFAULT_SLIPPAGE,
  SLIPPAGE_OPTIONS,
  type PayToken,
  type SwapMode,
  isPayTokenConfigured,
} from "@/lib/swap/constants";
import { isWopnToken } from "@/lib/swap/payment-tokens";
import { getWopnAddress } from "@/lib/chain-config/opn";
import { cn } from "@/lib/utils";
import { opnChain } from "@/lib/wagmi";
import { resolveTokenByAddress } from "@/lib/token-resolve";
import type { SwapTxStatus } from "@/hooks/swap/useSwapExecute";
import { useSwitchToOpnNetwork } from "@/hooks/useEnsureOpnNetwork";

interface SwapPanelProps {
  initialToken?: string;
  initialMode?: SwapMode;
}

function mapWrapStatus(status: string): SwapTxStatus {
  if (status === "pending") return "pending";
  if (status === "success") return "success";
  if (status === "error") return "failed";
  return "idle";
}

function SwapAmountInput({
  value,
  onChange,
  readOnly = false,
}: {
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
}) {
  return (
    <input
      type="text"
      inputMode="decimal"
      placeholder="0.0"
      value={value}
      readOnly={readOnly}
      onChange={readOnly ? undefined : (e) => onChange?.(e.target.value)}
      className="min-w-0 flex-1 bg-transparent text-3xl font-semibold tabular-nums outline-none placeholder:text-muted-foreground/50"
    />
  );
}

export function SwapPanel({ initialToken = "", initialMode = "buy" }: SwapPanelProps) {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { wrongNetwork, switching, switchError, switchToOpn } = useSwitchToOpnNetwork();
  const wopnAddress = getWopnAddress();

  const [tokenAddress, setTokenAddress] = useState(initialToken);
  const [tokenSymbol, setTokenSymbol] = useState("Token");
  const [mode, setMode] = useState<SwapMode>(initialMode === "sell" ? "sell" : "buy");
  const [payToken, setPayToken] = useState<PayToken>(OPN_PAY_TOKEN);
  const [amountIn, setAmountIn] = useState("");
  const [slippage, setSlippage] = useState(DEFAULT_SLIPPAGE);
  const [gasEstimate, setGasEstimate] = useState<bigint | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const swapCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const validToken = isValidTokenAddress(tokenAddress);

  const isAutoWrap = mode === "buy" && payToken.isNative && validToken && isWopnToken(tokenAddress);
  const isAutoUnwrap = mode === "sell" && payToken.isNative && validToken && isWopnToken(tokenAddress);
  const isWrapOrUnwrap = isAutoWrap || isAutoUnwrap;

  const { quote, loading, error: quoteError } = useSwapQuote(
    tokenAddress,
    amountIn,
    mode,
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

  const { data: nativeBalance } = useBalance({ address, chainId: opnChain.id });
  const { data: wopnBalance } = useBalance({ address, token: wopnAddress, chainId: opnChain.id });

  const { data: projectBalance } = useReadContract({
    address: validToken ? (tokenAddress as Address) : undefined,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: opnChain.id,
  });

  const { data: payErc20Balance } = useReadContract({
    address:
      !payToken.isNative && payToken.address && address ? payToken.address : undefined,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: opnChain.id,
  });

  const needsApproval =
    !isWrapOrUnwrap && !!quote?.approvalToken && allowance < (quote?.amountIn ?? 0n);

  const minReceived = quote ? applySlippage(quote.amountOut, slippage) : 0n;

  const receiveDecimals =
    isWrapOrUnwrap || payToken.isNative
      ? 18
      : mode === "buy"
        ? 18
        : quote?.paymentDecimals ?? payToken.decimals;

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
      return amountIn && Number(amountIn) > 0 ? amountIn : "";
    }
    if (!quote) return "";
    return formatSwapAmount(quote.amountOut, receiveDecimals);
  }, [isWrapOrUnwrap, amountIn, quote, receiveDecimals]);

  const minReceivedDisplay = useMemo(() => {
    if (isWrapOrUnwrap) {
      return amountIn && Number(amountIn) > 0
        ? `${amountIn} ${mode === "buy" ? "WOPN" : "OPN"}`
        : "—";
    }
    if (!quote) return "—";
    const label = mode === "buy" ? tokenSymbol : payToken.symbol;
    return `${formatSwapAmount(minReceived, receiveDecimals)} ${label}`;
  }, [isWrapOrUnwrap, amountIn, quote, minReceived, receiveDecimals, mode, tokenSymbol, payToken.symbol]);

  useEffect(() => {
    if (!quote || !address || isWrapOrUnwrap) {
      setGasEstimate(null);
      return;
    }
    estimateGas(quote, mode, slippage).then(setGasEstimate);
  }, [quote, address, mode, slippage, estimateGas, isWrapOrUnwrap]);

  useEffect(() => {
    if (approved) refetch();
  }, [approved, refetch]);

  useEffect(() => {
    if (status === "success" || wrapStatus === "success") {
      setAmountIn("");
      setGasEstimate(null);
    }
  }, [status, wrapStatus]);

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

  function flipDirection() {
    setMode((m) => (m === "buy" ? "sell" : "buy"));
    setAmountIn("");
    resetAll();
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
    await executeSwap(quote, mode, slippage);
  }

  function balanceValue(
    data: bigint | { value: bigint } | undefined
  ): bigint | undefined {
    if (data === undefined) return undefined;
    return typeof data === "bigint" ? data : data.value;
  }

  const fromBalance = useMemo(() => {
    if (isAutoWrap) return balanceValue(nativeBalance);
    if (isAutoUnwrap) return balanceValue(wopnBalance);
    if (mode === "buy") {
      return payToken.isNative ? balanceValue(nativeBalance) : payErc20Balance;
    }
    return projectBalance;
  }, [
    isAutoWrap,
    isAutoUnwrap,
    mode,
    payToken.isNative,
    nativeBalance,
    wopnBalance,
    payErc20Balance,
    projectBalance,
  ]);

  const toBalance = useMemo(() => {
    if (isAutoWrap) return balanceValue(wopnBalance);
    if (isAutoUnwrap) return balanceValue(nativeBalance);
    if (mode === "buy") return projectBalance;
    return payToken.isNative ? balanceValue(nativeBalance) : payErc20Balance;
  }, [
    isAutoWrap,
    isAutoUnwrap,
    mode,
    payToken.isNative,
    nativeBalance,
    wopnBalance,
    payErc20Balance,
    projectBalance,
  ]);

  const fromDecimals =
    mode === "buy" && !payToken.isNative && !isAutoUnwrap ? payToken.decimals : 18;

  const toDecimals =
    mode === "sell" && !payToken.isNative && !isAutoWrap ? payToken.decimals : 18;

  const fromBalanceLabel = fromBalance
    ? Number(formatUnits(fromBalance, fromDecimals)).toFixed(4)
    : null;

  const toBalanceLabel = toBalance
    ? Number(formatUnits(toBalance, toDecimals)).toFixed(4)
    : null;

  const actionBusy = isWrapOrUnwrap ? wrapPending : isBusy;

  const actionLabel = !isConnected
    ? "Connect Wallet"
    : actionBusy
      ? "Processing…"
      : needsApproval && !approved
        ? mode === "buy" && !payToken.isNative
          ? `Approve ${payToken.symbol}`
          : "Approve Token"
        : !amountIn || Number(amountIn) <= 0
          ? "Enter Amount"
          : "Swap";

  const activeStatus = isWrapOrUnwrap ? mapWrapStatus(wrapStatus) : status;
  const activeHash = isWrapOrUnwrap ? wrapHash ?? undefined : hash;
  const activeError = isWrapOrUnwrap ? wrapError : txError;

  const submitDisabled =
    !isConnected ||
    actionBusy ||
    wrongNetwork ||
    !amountIn ||
    Number(amountIn) <= 0 ||
    !validToken ||
    (!isWrapOrUnwrap && (!quote || loading || !isPayTokenConfigured(payToken)));

  return (
    <div className="mx-auto w-full max-w-lg space-y-4">
      <Card ref={swapCardRef} className="overflow-visible border-border shadow-sm">
        <CardHeader className="relative z-20 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-2xl">Swap</CardTitle>
              <CardDescription>Trade tokens instantly</CardDescription>
            </div>
            {!isWrapOrUnwrap && (
              <div ref={settingsRef} className="relative z-30 shrink-0">
                <button
                  type="button"
                  onClick={() => setSettingsOpen((o) => !o)}
                  className={cn(
                    "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground",
                    settingsOpen && "border-primary/40 bg-primary/5 text-primary"
                  )}
                  aria-label="Swap settings"
                  aria-expanded={settingsOpen}
                >
                  <Settings2 className="h-4 w-4" />
                </button>
                {settingsOpen && (
                  <div
                    className="absolute right-0 top-full z-50 mt-2 w-52 rounded-lg border border-border bg-background p-3 shadow-xl"
                    role="dialog"
                    aria-label="Slippage settings"
                  >
                    <p className="mb-2 text-xs font-medium text-foreground">Slippage tolerance</p>
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
                              : "border-border bg-muted/30 text-foreground hover:border-border"
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

        <CardContent className="relative z-0 space-y-3 overflow-visible">
          {wrongNetwork && (
            <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Your wallet is on the wrong network. Swaps use {opnChain.nativeCurrency.symbol} on{" "}
                  {opnChain.name}, not Ethereum (ETH).
                </span>
              </div>
              {switchError && <p className="text-xs text-amber-950/80">{switchError}</p>}
            </div>
          )}

          {isWrapOrUnwrap && (
            <p className="text-xs text-muted-foreground">OPN ↔ WOPN converts at 1:1 automatically.</p>
          )}

          {/* From */}
          <div className="overflow-visible rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">From</span>
              {fromBalanceLabel && (
                <span className="text-muted-foreground">
                  Balance: {fromBalanceLabel}{" "}
                  <button
                    type="button"
                    onClick={() => {
                      if (fromBalance) setAmountIn(formatUnits(fromBalance, fromDecimals));
                    }}
                    className="font-semibold text-primary hover:underline"
                  >
                    MAX
                  </button>
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <SwapAmountInput
                value={amountIn}
                onChange={(v) => {
                  setAmountIn(v);
                  resetAll();
                }}
              />
              {mode === "buy" ? (
                <SwapPayTokenSelect
                  variant="pill"
                  value={payToken}
                  onChange={setPayToken}
                  excludeAddress={tokenAddress}
                  rowAnchorRef={swapCardRef}
                />
              ) : (
                <SwapTokenPicker
                  variant="pill"
                  value={tokenAddress}
                  onChange={setTokenAddress}
                  placeholder="Token"
                  fallbackSymbol={tokenSymbol !== "Token" ? tokenSymbol : undefined}
                  rowAnchorRef={swapCardRef}
                />
              )}
            </div>
          </div>

          {/* Flip */}
          <div className="flex justify-center -my-1">
            <button
              type="button"
              onClick={flipDirection}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Flip swap direction"
            >
              <ArrowDownUp className="h-4 w-4" />
            </button>
          </div>

          {/* To */}
          <div className="overflow-visible rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">To</span>
              {toBalanceLabel && (
                <span className="text-muted-foreground">Balance: {toBalanceLabel}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <SwapAmountInput value={amountOutDisplay} readOnly />
              {mode === "buy" ? (
                <SwapTokenPicker
                  variant="pill"
                  value={tokenAddress}
                  onChange={setTokenAddress}
                  placeholder="Token"
                  fallbackSymbol={tokenSymbol !== "Token" ? tokenSymbol : undefined}
                  rowAnchorRef={swapCardRef}
                />
              ) : (
                <SwapPayTokenSelect
                  variant="pill"
                  value={payToken}
                  onChange={setPayToken}
                  excludeAddress={tokenAddress}
                  rowAnchorRef={swapCardRef}
                />
              )}
            </div>
          </div>

          {validToken && !isWrapOrUnwrap && (
            <div className="space-y-1.5 rounded-lg border border-border/40 bg-muted/10 p-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Route</span>
                <span>{quote?.routeLabel ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Min. received</span>
                <span>{quote ? minReceivedDisplay : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price impact</span>
                <span className={quote && quote.priceImpactBps > 300 ? "text-amber-600" : ""}>
                  {quote ? `${(quote.priceImpactBps / 100).toFixed(2)}%` : "—"}
                </span>
              </div>
              {gasEstimate != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Est. gas</span>
                  <span>{gasEstimate.toString()}</span>
                </div>
              )}
            </div>
          )}

          {quoteError && !isWrapOrUnwrap && (
            <p className="text-sm text-red-600">{quoteError}</p>
          )}

          {!isConnected ? (
            <Button className="w-full" size="lg" onClick={() => openConnectModal?.()}>
              Connect Wallet
            </Button>
          ) : wrongNetwork ? (
            <Button
              className="w-full"
              size="lg"
              disabled={switching}
              onClick={() => void switchToOpn()}
            >
              {switching ? "Switching network…" : `Switch to ${opnChain.name}`}
            </Button>
          ) : needsApproval && !approved ? (
            <Button
              className="w-full"
              size="lg"
              disabled={!quote || approving || actionBusy}
              onClick={approve}
            >
              {approving ? "Approving…" : actionLabel}
            </Button>
          ) : (
            <Button
              className="w-full"
              size="lg"
              disabled={submitDisabled}
              onClick={() => void handleAction()}
            >
              {actionLabel}
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
