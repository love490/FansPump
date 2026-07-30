"use client";

import { useEffect, useMemo, useState } from "react";
import type { Address } from "viem";
import { formatEther, formatGwei, isAddress, parseUnits } from "viem";
import {
  useEstimateGas,
  useGasPrice,
  usePublicClient,
  useSendTransaction,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { erc20Abi } from "@/lib/swap/abis";
import { formatContractError } from "@/lib/contract-errors";
import { explorerTxUrl } from "@/lib/explorer";
import { ExternalLink } from "lucide-react";

const transferAbi = [
  ...erc20Abi,
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

type SendTokenDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletAddress: Address | undefined;
  tokenAddress: string | null;
  symbol: string;
  decimals: number;
  balance: bigint;
  isNative?: boolean;
};

export function SendTokenDialog({
  open,
  onOpenChange,
  walletAddress,
  tokenAddress,
  symbol,
  decimals,
  balance,
  isNative = false,
}: SendTokenDialogProps) {
  const client = usePublicClient();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  const { writeContractAsync, isPending: writing } = useWriteContract();
  const { sendTransactionAsync, isPending: sendingNative } = useSendTransaction();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash ?? undefined,
  });

  const validRecipient = isAddress(recipient.trim());
  const parsedAmount = useMemo(() => {
    try {
      if (!amount.trim()) return null;
      return parseUnits(amount.trim(), decimals);
    } catch {
      return null;
    }
  }, [amount, decimals]);

  const canSubmit =
    Boolean(walletAddress) &&
    validRecipient &&
    parsedAmount !== null &&
    parsedAmount > 0n &&
    parsedAmount <= balance &&
    (isNative || Boolean(tokenAddress?.startsWith("0x")));

  const { data: gasPrice } = useGasPrice({ query: { enabled: open } });
  const { data: estimatedGas } = useEstimateGas({
    to: validRecipient ? (recipient.trim() as Address) : undefined,
    value: isNative && parsedAmount ? parsedAmount : undefined,
    query: { enabled: open && isNative && validRecipient && parsedAmount !== null },
  });

  const feeHint = useMemo(() => {
    if (!gasPrice) return null;
    const gas = estimatedGas ?? (isNative ? 21_000n : 65_000n);
    try {
      const fee = gas * gasPrice;
      return `≈ ${formatEther(fee)} OPN (${formatGwei(gasPrice)} gwei)`;
    } catch {
      return null;
    }
  }, [gasPrice, estimatedGas, isNative]);

  useEffect(() => {
    if (!open) {
      setRecipient("");
      setAmount("");
      setError(null);
      setTxHash(null);
    }
  }, [open]);

  function setMax() {
    if (balance <= 0n) {
      setAmount("0");
      return;
    }
    if (isNative && gasPrice) {
      const reserve = (estimatedGas ?? 21_000n) * gasPrice * 2n;
      const spendable = balance > reserve ? balance - reserve : 0n;
      setAmount(formatUnitsSafe(spendable, decimals));
      return;
    }
    setAmount(formatUnitsSafe(balance, decimals));
  }

  async function submit() {
    if (!walletAddress || !canSubmit || !parsedAmount) return;
    setError(null);
    try {
      if (isNative) {
        const hash = await sendTransactionAsync({
          to: recipient.trim() as Address,
          value: parsedAmount,
        });
        setTxHash(hash);
        if (client) {
          await client.waitForTransactionReceipt({ hash, timeout: 120_000 });
        }
      } else {
        const hash = await writeContractAsync({
          address: tokenAddress as Address,
          abi: transferAbi,
          functionName: "transfer",
          args: [recipient.trim() as Address, parsedAmount],
        });
        setTxHash(hash);
        if (client) {
          await client.waitForTransactionReceipt({ hash, timeout: 120_000 });
        }
      }
    } catch (e) {
      setError(formatContractError(e instanceof Error ? e.message : "Send failed"));
    }
  }

  const busy = writing || sendingNative || confirming;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send {symbol}</DialogTitle>
          <DialogDescription>
            Transfer {symbol} on OPN Chain. Double-check the recipient address before confirming.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="send-recipient">Recipient</Label>
            <Input
              id="send-recipient"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x…"
              disabled={busy || isSuccess}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="send-amount">Amount</Label>
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={setMax}
                disabled={busy || isSuccess || balance <= 0n}
              >
                Max
              </button>
            </div>
            <Input
              id="send-amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              inputMode="decimal"
              disabled={busy || isSuccess}
            />
            <p className="text-xs text-muted-foreground">
              Available: {formatUnitsSafe(balance, decimals)} {symbol}
            </p>
          </div>

          {feeHint && (
            <p className="text-xs text-muted-foreground">Estimated network fee: {feeHint}</p>
          )}

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          {isSuccess && txHash ? (
            <div className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
              <p className="font-medium text-emerald-700 dark:text-emerald-400">Transfer sent</p>
              <a
                href={explorerTxUrl(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                View on explorer
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ) : (
            <Button
              type="button"
              className="w-full"
              disabled={!canSubmit || busy}
              onClick={() => void submit()}
            >
              {busy ? "Confirm in wallet…" : `Send ${symbol}`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatUnitsSafe(value: bigint, decimals: number): string {
  try {
    const neg = value < 0n;
    const abs = neg ? -value : value;
    const base = 10n ** BigInt(decimals);
    const whole = abs / base;
    const frac = abs % base;
    if (frac === 0n) return `${neg ? "-" : ""}${whole}`;
    const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
    return `${neg ? "-" : ""}${whole}.${fracStr}`;
  } catch {
    return "0";
  }
}
