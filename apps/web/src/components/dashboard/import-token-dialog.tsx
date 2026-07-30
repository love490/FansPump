"use client";

import { useState } from "react";
import type { Address } from "viem";
import { usePublicClient, useWalletClient } from "wagmi";
import { Download } from "lucide-react";
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
import { TokenLogo } from "@/components/tokens/token-logo";
import { erc20Abi } from "@/lib/swap/abis";
import { isValidTokenAddress } from "@/lib/swap/routerAdapter";
import { resolveTokenByAddress } from "@/lib/token-resolve";
import { saveImportedToken, type ImportedToken } from "@/lib/dashboard/imported-tokens";
import { addTokenToWallet } from "@/lib/wallet/watch-asset";
import { formatUnits } from "viem";

type Preview = {
  contractAddress: string;
  name: string;
  symbol: string;
  decimals: number;
  logoUrl?: string | null;
  balance: bigint;
};

type ImportTokenDialogProps = {
  walletAddress: string | undefined;
  onImported: (tokens: ImportedToken[]) => void;
};

export function ImportTokenDialog({ walletAddress, onImported }: ImportTokenDialogProps) {
  const client = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function reset() {
    setAddress("");
    setPreview(null);
    setError(null);
    setNotice(null);
  }

  async function lookup() {
    const trimmed = address.trim();
    if (!isValidTokenAddress(trimmed)) {
      setError("Enter a valid contract address.");
      return;
    }
    if (!client) {
      setError("No chain connection available.");
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const addr = trimmed.toLowerCase() as Address;
      const resolved = await resolveTokenByAddress(trimmed, client);

      const [decimalsResult, balanceResult] = await Promise.all([
        client
          .readContract({ address: addr, abi: erc20Abi, functionName: "decimals" })
          .catch(() => null),
        walletAddress
          ? client
              .readContract({
                address: addr,
                abi: erc20Abi,
                functionName: "balanceOf",
                args: [walletAddress as Address],
              })
              .catch(() => 0n)
          : Promise.resolve(0n),
      ]);

      const decimals = Number(resolved?.decimals ?? decimalsResult ?? 18);
      if (!resolved && decimalsResult === null) {
        setError("This address is not an ERC-20 token on OPN Chain.");
        return;
      }

      setPreview({
        contractAddress: addr,
        name: resolved?.name ?? resolved?.symbol ?? "Unknown token",
        symbol: resolved?.symbol ?? "TKN",
        decimals: Number.isFinite(decimals) ? decimals : 18,
        logoUrl: resolved?.logoUrl ?? null,
        balance: typeof balanceResult === "bigint" ? balanceResult : 0n,
      });
    } catch {
      setError("Could not read this token. Check the address and try again.");
    } finally {
      setBusy(false);
    }
  }

  function save() {
    if (!preview) return;
    const tokens = saveImportedToken(walletAddress, {
      contractAddress: preview.contractAddress,
      name: preview.name,
      symbol: preview.symbol,
      decimals: preview.decimals,
      logoUrl: preview.logoUrl,
    });
    onImported(tokens);
    setNotice(`${preview.symbol} added to your asset list.`);
  }

  async function addToWallet() {
    if (!preview) return;
    setBusy(true);
    setError(null);
    const result = await addTokenToWallet(walletClient, {
      address: preview.contractAddress,
      symbol: preview.symbol,
      decimals: preview.decimals,
      logoUrl: preview.logoUrl,
    });
    setBusy(false);
    if (result.ok) {
      setNotice(`${preview.symbol} added to your wallet.`);
    } else {
      setError(result.error ?? "Could not add the token to your wallet.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Download className="mr-1.5 h-4 w-4" />
        Import token
      </Button>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import token</DialogTitle>
          <DialogDescription>
            Paste a contract address to add any OPN Chain token to your asset list.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="import-token-address">Contract address</Label>
          <div className="flex gap-2">
            <Input
              id="import-token-address"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setPreview(null);
                setNotice(null);
              }}
              placeholder="0x…"
            />
            <Button type="button" onClick={() => void lookup()} disabled={busy || !address.trim()}>
              {busy ? "Checking…" : "Look up"}
            </Button>
          </div>
        </div>

        {preview && (
          <div className="space-y-3 rounded-xl border border-border p-3">
            <div className="flex items-center gap-3">
              <TokenLogo
                src={preview.logoUrl}
                symbol={preview.symbol}
                name={preview.name}
                layout="fixed"
                size={40}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {preview.name} <span className="text-muted-foreground">({preview.symbol})</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {preview.decimals} decimals · balance{" "}
                  {formatUnits(preview.balance, preview.decimals)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={save}>
                Add to asset list
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void addToWallet()}
              >
                Add to wallet
              </Button>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {notice && <p className="text-sm text-emerald-600 dark:text-emerald-400">{notice}</p>}
      </DialogContent>
    </Dialog>
  );
}
