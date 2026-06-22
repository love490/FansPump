"use client";

import { useEffect, useState } from "react";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { parseUnits, type Address } from "viem";
import { SwapTokenPicker } from "@/components/swap/swap-token-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { useWalletLiquidityTokens } from "@/hooks/liquidity/useWalletLiquidityTokens";
import { erc20Abi } from "@/lib/swap/abis";
import { isValidTokenAddress } from "@/lib/swap/routerAdapter";
import { formatLiquidityAmountFromWei } from "@/lib/liquidity/format-amount";
import { cn, shortenAddress } from "@/lib/utils";

const burnAbi = [
  ...erc20Abi,
  {
    type: "function",
    name: "burn",
    stateMutability: "nonpayable",
    inputs: [{ name: "value", type: "uint256" }],
    outputs: [],
  },
] as const;

export function TokenBurnPanel() {
  const { address, isConnected } = useAccount();
  const client = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { tokens: walletTokens, loading: walletLoading, refresh: refreshWalletTokens } =
    useWalletLiquidityTokens(address);

  const [tokenAddress, setTokenAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [decimals, setDecimals] = useState(18);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const validToken = isValidTokenAddress(tokenAddress);

  const { data: symbolRaw } = useReadContract({
    address: validToken ? (tokenAddress as Address) : undefined,
    abi: erc20Abi,
    functionName: "symbol",
  });

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: validToken ? (tokenAddress as Address) : undefined,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  const symbol =
    typeof symbolRaw === "string" && symbolRaw.length > 0 ? symbolRaw : "Token";

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
        if (!cancelled) setDecimals(Number(d));
      })
      .catch(() => {
        if (!cancelled) setDecimals(18);
      });
    return () => {
      cancelled = true;
    };
  }, [validToken, tokenAddress, client]);

  async function burnTokens() {
    if (!address || !validToken || !amount.trim()) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const parsed = parseUnits(amount.trim(), decimals);
      if (parsed <= 0n) throw new Error("Enter an amount greater than zero");
      if (balance !== undefined && parsed > balance) {
        throw new Error("Amount exceeds your balance");
      }

      setStatus("Confirm burn in your wallet…");
      const hash = await writeContractAsync({
        address: tokenAddress as Address,
        abi: burnAbi,
        functionName: "burn",
        args: [parsed],
      });

      if (client) {
        await client.waitForTransactionReceipt({ hash });
      }

      setStatus(`Burned ${amount} ${symbol}.`);
      setAmount("");
      await refetchBalance();
      void refreshWalletTokens();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Burn failed");
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Token contract</Label>
        <SwapTokenPicker
          value={tokenAddress}
          onChange={setTokenAddress}
          label="Token"
          searchPlaceholder="Paste address or search by name"
        />
      </div>

      {isConnected && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-muted-foreground">Tokens in your wallet</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={walletLoading}
              onClick={() => void refreshWalletTokens()}
            >
              {walletLoading ? "Scanning…" : "Refresh"}
            </Button>
          </div>
          {walletTokens.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Connect your wallet or paste a token contract address above.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {walletTokens.map((t) => {
                const active = tokenAddress.toLowerCase() === t.contractAddress.toLowerCase();
                return (
                  <button
                    key={t.contractAddress}
                    type="button"
                    onClick={() => setTokenAddress(t.contractAddress)}
                    className={cn(
                      "flex flex-col items-start rounded-lg border p-3 text-left transition-colors hover:bg-muted/40",
                      active && "border-primary bg-primary/5"
                    )}
                  >
                    <span className="font-semibold">{t.symbol}</span>
                    <span className="text-xs text-muted-foreground">{t.name}</span>
                    <span className="mt-1 font-mono text-xs text-muted-foreground">
                      {shortenAddress(t.contractAddress, 6)}
                    </span>
                    <span className="mt-1 text-xs">
                      Balance: {formatLiquidityAmountFromWei(t.balance, t.decimals)} {t.symbol}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {validToken && (
        <div className="space-y-2">
          <Label htmlFor="burn-amount">Amount to burn</Label>
          <Input
            id="burn-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            disabled={!isConnected || busy}
          />
          {isConnected && balance !== undefined && (
            <p className="text-xs text-muted-foreground">
              Balance: {formatLiquidityAmountFromWei(balance, decimals)} {symbol}
            </p>
          )}
        </div>
      )}

      {!isConnected && (
        <p className="text-sm text-muted-foreground">Connect your wallet to burn tokens.</p>
      )}

      <Button
        type="button"
        variant="destructive"
        disabled={!isConnected || !validToken || !amount.trim() || busy}
        onClick={() => void burnTokens()}
      >
        {busy ? "Burning…" : `Burn ${symbol}`}
      </Button>

      {status && (
        <DismissibleAlert variant="success" onDismiss={() => setStatus(null)}>
          {status}
        </DismissibleAlert>
      )}
      {error && (
        <DismissibleAlert variant="error" onDismiss={() => setError(null)}>
          {error}
        </DismissibleAlert>
      )}
    </div>
  );
}
