"use client";

import { apiUrl } from "@/lib/api";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import {
  useAccount,
  useBalance,
  useChainId,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { formatUnits, maxUint256, parseEther, parseUnits, type Address, type Hash } from "viem";
import { SwapTokenPicker } from "@/components/swap/swap-token-picker";
import { Button } from "@/components/ui/button";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { tokenAbi } from "@/lib/abis/factory";
import { DEX_ROUTER_ADDRESS, opnChain } from "@/lib/wagmi";
import { dexRouterLiquidityAbi } from "@/lib/liquidity/dex-router-abi";
import { simulateAddLiquidity } from "@/lib/liquidity/add-liquidity-tx";
import {
  getLiquidityPair,
  LIQUIDITY_DEADLINE_SECONDS,
  pairConflictsWithToken,
  type LiquidityPairId,
} from "@/lib/liquidity/pair-tokens";
import { isValidTokenAddress } from "@/lib/swap/routerAdapter";
import { erc20Abi } from "@/lib/swap/abis";
import { saveLiquidityPosition } from "@/lib/liquidity/my-liquidity-storage";
import { resolveDexFactory } from "@/lib/liquidity/dex-factory";
import { findPairAddress, quoteCandidatesForPairId } from "@/lib/liquidity/pair-resolve";
import { readRouterWeth } from "@/lib/liquidity/router-weth";
import { shortenAddress } from "@/lib/utils";
import { opnChainConfig } from "@/lib/chain-config/opn";
import { ensureWopnBalance, readWopnBalance } from "@/lib/liquidity/wrap-opn-tx";
import { formatLiquidityAmountFromWei } from "@/lib/liquidity/format-amount";
import { LiquidityPairPicker } from "@/components/liquidity/liquidity-pair-picker";

type AddLiquidityPanelProps = {
  initialToken?: string;
  onLiquidityAdded?: () => void;
};

function LiquidityAmountInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="text"
      inputMode="decimal"
      placeholder="0.0"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="min-w-0 flex-1 bg-transparent text-3xl font-semibold tabular-nums outline-none placeholder:text-muted-foreground/50"
    />
  );
}

type LiquidityAction = "idle" | "approve-token" | "wrap-opn" | "approve-pair" | "add";

function formatBalance(amount: bigint, decimals: number): string {
  return formatLiquidityAmountFromWei(amount, decimals);
}

function parseError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && e && "shortMessage" in e && typeof (e as { shortMessage: string }).shortMessage === "string") {
    return (e as { shortMessage: string }).shortMessage;
  }
  return "Transaction failed";
}

export function AddLiquidityPanel({
  initialToken = "",
  onLiquidityAdded,
}: AddLiquidityPanelProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const client = usePublicClient();

  const [tokenAddress, setTokenAddress] = useState(initialToken);
  const [pairId, setPairId] = useState<LiquidityPairId>("OPN");
  const [tokenAmount, setTokenAmount] = useState("");
  const [pairAmount, setPairAmount] = useState("");
  const [tokenDecimals, setTokenDecimals] = useState(18);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<LiquidityAction>("idle");
  const [processing, setProcessing] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<Hash | undefined>();

  const [pairDecimalsResolved, setPairDecimalsResolved] = useState<number | null>(null);

  const pair = getLiquidityPair(pairId);
  const pairDecimals = pairDecimalsResolved ?? pair.decimals;
  const wopnPair = getLiquidityPair("WOPN");
  const wopnAddress = opnChainConfig.contracts.wopnExplicit;
  const usesWopnPath = pair.isNative;
  const validToken = isValidTokenAddress(tokenAddress);
  const pairConflict = validToken && pairConflictsWithToken(pair, tokenAddress);
  const wrongNetwork = isConnected && chainId !== opnChain.id;

  const { writeContractAsync } = useWriteContract();

  const { data: tokenSymbolRaw } = useReadContract({
    address: validToken ? (tokenAddress as Address) : undefined,
    abi: erc20Abi,
    functionName: "symbol",
  });

  const tokenSymbol =
    typeof tokenSymbolRaw === "string" && tokenSymbolRaw.length > 0 ? tokenSymbolRaw : "Token";

  const { data: tokenBalance, refetch: refetchTokenBalance } = useReadContract({
    address: validToken ? (tokenAddress as Address) : undefined,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  const { data: pairTokenBalance, refetch: refetchPairBalance } = useReadContract({
    address: !pair.isNative && pair.address && validToken ? pair.address : undefined,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  const { data: nativeBalance, refetch: refetchNativeBalance } = useBalance({ address });

  const { data: tokenAllowance, refetch: refetchTokenAllowance } = useReadContract({
    address: validToken ? (tokenAddress as Address) : undefined,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, DEX_ROUTER_ADDRESS] : undefined,
  });

  const { data: wopnAllowance, refetch: refetchWopnAllowance } = useReadContract({
    address: usesWopnPath && validToken ? wopnAddress : undefined,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, DEX_ROUTER_ADDRESS] : undefined,
  });

  const { data: wopnBalance, refetch: refetchWopnBalance } = useReadContract({
    address: usesWopnPath && validToken ? wopnAddress : undefined,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  const { data: pairAllowance, refetch: refetchPairAllowance } = useReadContract({
    address: !usesWopnPath && pair.address && validToken ? pair.address : undefined,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, DEX_ROUTER_ADDRESS] : undefined,
  });

  useEffect(() => {
    setTokenAddress(initialToken);
  }, [initialToken]);

  useEffect(() => {
    if (!validToken || !client) return;
    let cancelled = false;
    client
      .readContract({
        address: tokenAddress as Address,
        abi: erc20Abi,
        functionName: "decimals",
      })
      .then((d) => {
        if (!cancelled) setTokenDecimals(Number(d));
      })
      .catch(() => {
        if (!cancelled) setTokenDecimals(18);
      });
    return () => {
      cancelled = true;
    };
  }, [validToken, tokenAddress, client]);

  useEffect(() => {
    if (pair.isNative || !pair.address || !client) {
      setPairDecimalsResolved(null);
      return;
    }
    let cancelled = false;
    client
      .readContract({
        address: pair.address,
        abi: erc20Abi,
        functionName: "decimals",
      })
      .then((d) => {
        if (!cancelled) setPairDecimalsResolved(Number(d));
      })
      .catch(() => {
        if (!cancelled) setPairDecimalsResolved(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pair, client]);

  const parsedTokenAmount = useMemo(() => {
    if (!tokenAmount || Number(tokenAmount) <= 0) return null;
    try {
      return parseUnits(tokenAmount, tokenDecimals);
    } catch {
      return null;
    }
  }, [tokenAmount, tokenDecimals]);

  const parsedPairAmount = useMemo(() => {
    if (!pairAmount || Number(pairAmount) <= 0) return null;
    try {
      return pair.isNative ? parseEther(pairAmount) : parseUnits(pairAmount, pairDecimals);
    } catch {
      return null;
    }
  }, [pairAmount, pair, pairDecimals]);

  const needsTokenApproval =
    parsedTokenAmount !== null && (tokenAllowance ?? 0n) < parsedTokenAmount;
  const needsWopnApproval =
    usesWopnPath && parsedPairAmount !== null && (wopnAllowance ?? 0n) < parsedPairAmount;
  const needsPairApproval =
    !usesWopnPath && parsedPairAmount !== null && (pairAllowance ?? 0n) < parsedPairAmount;
  const needsOpnWrap =
    usesWopnPath &&
    parsedPairAmount !== null &&
    (wopnBalance ?? 0n) < parsedPairAmount;

  const pairBalanceDisplay = pair.isNative ? nativeBalance?.value : pairTokenBalance;
  const pairBalanceDecimals = pair.isNative ? pair.decimals : pairDecimals;

  const busy = processing;

  const amountsValid = Boolean(parsedTokenAmount && parsedPairAmount && !pairConflict);

  const RECEIPT_TIMEOUT_MS = 120_000;

  async function waitForTx(hash: Hash) {
    if (!client) throw new Error("Network client unavailable");
    const receipt = await client.waitForTransactionReceipt({
      hash,
      timeout: RECEIPT_TIMEOUT_MS,
    });
    if (receipt.status !== "success") {
      throw new Error("Transaction reverted on-chain");
    }
    return receipt;
  }

  async function submitTx(
    request: {
      address: Address;
      abi: readonly unknown[];
      functionName: string;
      args: readonly unknown[];
      value?: bigint;
    },
    label: string
  ): Promise<Hash> {
    setStatus(`${label} â€” confirm in your walletâ€¦`);
    setError(null);
    const hash = await writeContractAsync(
      request as Parameters<typeof writeContractAsync>[0]
    );
    setLastTxHash(hash);
    await waitForTx(hash);
    return hash;
  }

  async function readAllowance(token: Address, owner: Address): Promise<bigint> {
    if (!client) return 0n;
    return client.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "allowance",
      args: [owner, DEX_ROUTER_ADDRESS],
    });
  }

  async function addLiquidity() {
    if (!address || !client || !validToken || !parsedTokenAmount || !parsedPairAmount || pairConflict) {
      return;
    }

    setProcessing(true);
    setAction("add");
    setError(null);

    try {
      const tokenAllowanceNow = await readAllowance(tokenAddress as Address, address);
      if (tokenAllowanceNow < parsedTokenAmount) {
        setAction("approve-token");
        await submitTx(
          {
            address: tokenAddress as Address,
            abi: erc20Abi,
            functionName: "approve",
            args: [DEX_ROUTER_ADDRESS, maxUint256],
          },
          `Step 1 â€” Approve ${tokenSymbol} in your wallet`
        );
        await refetchTokenAllowance();
      }

      if (!pair.isNative && pair.address) {
        const pairAllowanceNow = await readAllowance(pair.address, address);
        if (pairAllowanceNow < parsedPairAmount) {
          setAction("approve-pair");
          await submitTx(
            {
              address: pair.address,
              abi: erc20Abi,
              functionName: "approve",
              args: [DEX_ROUTER_ADDRESS, maxUint256],
            },
            `Step 2 â€” Approve ${pair.symbol} in your wallet`
          );
          await refetchPairAllowance();
        }
      }

      const effectivePair = usesWopnPath ? wopnPair : pair;

      if (usesWopnPath) {
        const wopnBal = await readWopnBalance(client, wopnAddress, address);
        if (wopnBal < parsedPairAmount) {
          setAction("wrap-opn");
          setStatus("Wrapping OPN â†’ WOPN â€” confirm in your walletâ€¦");
          await ensureWopnBalance({
            client,
            wopnAddress,
            owner: address,
            required: parsedPairAmount,
            writeContractAsync: writeContractAsync as Parameters<typeof ensureWopnBalance>[0]["writeContractAsync"],
            waitForTx,
          });
          await refetchWopnBalance();
          await refetchNativeBalance();
        }

        const wopnAllowanceNow = await readAllowance(wopnAddress, address);
        if (wopnAllowanceNow < parsedPairAmount) {
          setAction("approve-pair");
          await submitTx(
            {
              address: wopnAddress,
              abi: erc20Abi,
              functionName: "approve",
              args: [DEX_ROUTER_ADDRESS, maxUint256],
            },
            "Step â€” Approve WOPN in your wallet"
          );
          await refetchWopnAllowance();
        }
      }

      setAction("add");
      const deadline = BigInt(Math.floor(Date.now() / 1000) + LIQUIDITY_DEADLINE_SECONDS);

      const tokenAllowanceFinal = await readAllowance(tokenAddress as Address, address);
      if (tokenAllowanceFinal < parsedTokenAmount) {
        throw new Error(`${tokenSymbol} approval failed or was rejected.`);
      }

      if (!usesWopnPath && pair.address) {
        const pairAllowanceFinal = await readAllowance(pair.address, address);
        if (pairAllowanceFinal < parsedPairAmount) {
          throw new Error(`${pair.symbol} approval failed or was rejected.`);
        }
      }

      if (usesWopnPath) {
        const wopnAllowanceFinal = await readAllowance(wopnAddress, address);
        if (wopnAllowanceFinal < parsedPairAmount) {
          throw new Error("WOPN approval failed or was rejected.");
        }
      }

      const tx = await simulateAddLiquidity({
        client,
        router: DEX_ROUTER_ADDRESS,
        account: address,
        token: tokenAddress as Address,
        pair: effectivePair,
        amountToken: parsedTokenAmount,
        amountPair: parsedPairAmount,
        deadline,
      });

      setStatus(`Final step â€” Add liquidity (${tokenSymbol}/${pair.symbol}) â€” confirm in your walletâ€¦`);
      const addRequest =
        tx.value > 0n
          ? {
              address: DEX_ROUTER_ADDRESS,
              abi: dexRouterLiquidityAbi,
              functionName: tx.functionName,
              args: [...tx.args],
              value: tx.value,
            }
          : {
              address: DEX_ROUTER_ADDRESS,
              abi: dexRouterLiquidityAbi,
              functionName: tx.functionName,
              args: [...tx.args],
            };

      const addHash = await writeContractAsync(
        addRequest as Parameters<typeof writeContractAsync>[0]
      );
      setLastTxHash(addHash);

      console.log("[liquidity] Transaction submitted, saving positionâ€¦", addHash);
      saveLiquidityPosition({
        walletAddress: address.toLowerCase(),
        tokenAddress: tokenAddress.toLowerCase(),
        tokenSymbol,
        pairId,
        pairSymbol: pair.symbol,
        txHash: addHash,
        addedAt: new Date().toISOString(),
      });
      onLiquidityAdded?.();

      try {
        await waitForTx(addHash);
        setStatus(`Liquidity added (${tokenSymbol}/${pair.symbol}).`);
        console.log("[liquidity] Transaction confirmed on-chain");
        if (client) {
          try {
            const factory = await resolveDexFactory(client);
            const weth = await readRouterWeth(client, DEX_ROUTER_ADDRESS);
            const quotes = quoteCandidatesForPairId(
              pairId,
              weth,
              opnChainConfig.contracts.wopnExplicit,
              opnChainConfig.contracts.usdt,
              opnChainConfig.contracts.usdc
            );
            const pairAddr = await findPairAddress(
              client,
              factory,
              tokenAddress as Address,
              quotes
            );
            if (pairAddr) {
              saveLiquidityPosition({
                walletAddress: address.toLowerCase(),
                tokenAddress: tokenAddress.toLowerCase(),
                tokenSymbol,
                pairId,
                pairSymbol: pair.symbol,
                lpToken: pairAddr.toLowerCase(),
                txHash: addHash,
                addedAt: new Date().toISOString(),
              });
              void fetch(apiUrl("/api/pools/sync"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ poolAddress: pairAddr.toLowerCase() }),
              }).catch(() => undefined);
            }
          } catch (pairError) {
            console.warn("[liquidity] Could not resolve LP pair address:", pairError);
          }
        }
      } catch (receiptError) {
        console.warn("[liquidity] Receipt wait failed (tx may still succeed):", receiptError);
        setStatus(
          `Liquidity submitted â€” refresh My Liquidity in a moment if balance is not visible yet.`
        );
      }

      try {
        await Promise.all([
          refetchTokenBalance(),
          refetchPairBalance(),
          refetchNativeBalance(),
          refetchWopnBalance(),
          refetchTokenAllowance(),
          refetchPairAllowance(),
          refetchWopnAllowance(),
        ]);
      } catch (refreshError) {
        console.warn("[liquidity] Balance refresh failed:", refreshError);
      }

      resetAddForm();
    } catch (e) {
      console.error("[liquidity] Error:", e);
      setError(parseError(e));
      setStatus(null);
    } finally {
      setAction("idle");
      setProcessing(false);
    }
  }

  const pendingSteps =
    (needsTokenApproval ? 1 : 0) +
    (needsOpnWrap ? 1 : 0) +
    ((needsWopnApproval || needsPairApproval) ? 1 : 0) +
    1;

  const addLiquidityLabel =
    action === "approve-token"
      ? `Approving ${tokenSymbol}â€¦ (${pendingSteps} wallet steps)`
      : action === "wrap-opn"
        ? `Wrapping OPN â†’ WOPNâ€¦ (${pendingSteps} wallet steps)`
      : action === "approve-pair"
        ? `Approving ${usesWopnPath ? "WOPN" : pair.symbol}â€¦ (${pendingSteps} wallet steps)`
        : action === "add"
          ? `Adding liquidityâ€¦`
          : "Add liquidity";

  const terminalSuccess =
    Boolean(status && !busy && status.toLowerCase().includes("liquidity added"));

  function resetAddForm() {
    setTokenAmount("");
    setPairAmount("");
  }

  function dismissNotice() {
    setStatus(null);
    setError(null);
    setLastTxHash(undefined);
    resetAddForm();
  }

  const formDisabled = !isConnected || wrongNetwork;

  return (
    <div ref={cardRef} className="relative space-y-3 overflow-visible">
        <div className="overflow-visible rounded-xl border border-border/60 bg-muted/20 p-4">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Input</span>
            {isConnected && tokenBalance !== undefined && (
              <span className="text-muted-foreground">
                Balance: {formatBalance(tokenBalance, tokenDecimals)}{" "}
                <button
                  type="button"
                  className="font-semibold text-primary hover:underline"
                  onClick={() => setTokenAmount(formatBalance(tokenBalance, tokenDecimals))}
                >
                  MAX
                </button>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <LiquidityAmountInput value={tokenAmount} onChange={setTokenAmount} />
            <SwapTokenPicker
              variant="pill"
              value={tokenAddress}
              onChange={setTokenAddress}
              placeholder="Token"
              searchPlaceholder="Search by name or paste address"
              fallbackSymbol={tokenSymbol !== "Token" ? tokenSymbol : undefined}
              rowAnchorRef={cardRef}
            />
          </div>
        </div>

        <div className="flex justify-center -my-1">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm">
            <Plus className="h-4 w-4" />
          </span>
        </div>

        <div className="overflow-visible rounded-xl border border-border/60 bg-muted/20 p-4">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Input</span>
            {isConnected && pairBalanceDisplay !== undefined && (
              <span className="text-muted-foreground">
                Balance: {formatBalance(pairBalanceDisplay, pairBalanceDecimals)}{" "}
                <button
                  type="button"
                  className="font-semibold text-primary hover:underline"
                  onClick={() =>
                    setPairAmount(formatBalance(pairBalanceDisplay, pairBalanceDecimals))
                  }
                >
                  MAX
                </button>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <LiquidityAmountInput value={pairAmount} onChange={setPairAmount} />
            <LiquidityPairPicker value={pairId} onChange={setPairId} rowAnchorRef={cardRef} />
          </div>
        </div>

        {pairConflict && (
          <p className="text-sm text-red-600">
            This token is {pair.symbol}. Choose a different project token or pair asset.
          </p>
        )}

        {!isConnected && (
          <p className="text-sm text-muted-foreground">Connect your wallet to add liquidity.</p>
        )}

        {wrongNetwork && (
          <p className="text-sm text-amber-700">
            Switch your wallet to {opnChain.name} (chain {opnChain.id}).
          </p>
        )}

        {pairId === "OPN" && (
          <p className="text-sm text-muted-foreground">
            OPN is wrapped to WOPN automatically before liquidity is added.
          </p>
        )}

        <Button
          type="button"
          className="w-full"
          disabled={formDisabled || !amountsValid || busy || !validToken}
          onClick={() => void addLiquidity()}
        >
          {!isConnected ? "Connect wallet to add liquidity" : addLiquidityLabel}
        </Button>

        {status && busy && <p className="text-sm text-muted-foreground">{status}</p>}

        {terminalSuccess && status && (
          <DismissibleAlert variant="success" onDismiss={dismissNotice}>
            {status}
            {lastTxHash && (
              <p className="mt-2 font-mono text-xs opacity-80">
                Tx:{" "}
                <a
                  href={`${opnChainConfig.explorerUrl.replace(/\/$/, "")}/tx/${lastTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {shortenAddress(lastTxHash, 10)}
                </a>
              </p>
            )}
          </DismissibleAlert>
        )}

        {error && !busy && (
          <DismissibleAlert variant="error" onDismiss={dismissNotice}>
            {error}
          </DismissibleAlert>
        )}
      </div>
  );
}
