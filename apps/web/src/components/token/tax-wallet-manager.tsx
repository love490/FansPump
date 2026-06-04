"use client";

import { useMemo, useState, useEffect } from "react";
import {
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { isAddress } from "viem";
import {
  TOKEN_FEATURES,
  TAX_WALLETS,
  TAX_WALLET_LABELS,
  TAX_WALLET_SLOTS,
  hasFeature,
} from "@iopn/shared";
import { tokenAbi } from "@/lib/abis/factory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type TaxDistribution = {
  marketingWallet: `0x${string}`;
  developmentWallet: `0x${string}`;
  treasuryWallet: `0x${string}`;
  communityWallet: `0x${string}`;
  operationsWallet: `0x${string}`;
  liquidityWallet: `0x${string}`;
  marketingBps: number;
  developmentBps: number;
  treasuryBps: number;
  communityBps: number;
  operationsBps: number;
  liquidityBps: number;
};

const ZERO = "0x0000000000000000000000000000000000000000";

type TaxWalletManagerProps = {
  tokenAddress: `0x${string}`;
  isOwner: boolean;
  renounced: boolean;
};

export function TaxWalletManager({ tokenAddress, isOwner, renounced }: TaxWalletManagerProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pendingSlot, setPendingSlot] = useState<number | null>(null);

  const { data: featureFlags } = useReadContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: "featureFlags",
  });

  const { data: taxDistRaw, refetch } = useReadContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: "TAX_DISTRIBUTION",
  });

  const { writeContract, data: hash, isPending, reset, isSuccess } = useWriteContract();
  const { isLoading: confirming } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess && !confirming) {
      void refetch();
      setPendingSlot(null);
      reset();
    }
  }, [isSuccess, confirming, refetch, reset]);

  const taxDist = taxDistRaw as TaxDistribution | undefined;
  const isTaxable =
    featureFlags !== undefined && hasFeature(featureFlags as bigint, TOKEN_FEATURES.TAXABLE);

  const activeSlots = useMemo(() => {
    if (!taxDist) return [];
    return TAX_WALLETS.filter((w) => {
      const bpsKey = `${w.replace("Wallet", "Bps")}` as keyof TaxDistribution;
      return Number(taxDist[bpsKey] ?? 0) > 0;
    });
  }, [taxDist]);

  if (!isTaxable) return null;

  function currentWallet(walletKey: (typeof TAX_WALLETS)[number]): string {
    if (!taxDist) return ZERO;
    const addr = taxDist[walletKey];
    return addr && addr.toLowerCase() !== ZERO ? addr : "";
  }

  function saveWallet(walletKey: (typeof TAX_WALLETS)[number]) {
    const slot = TAX_WALLET_SLOTS[walletKey];
    const value = (drafts[walletKey] ?? currentWallet(walletKey)).trim();
    if (!isAddress(value)) return;

    setPendingSlot(slot);
    writeContract({
      address: tokenAddress,
      abi: tokenAbi,
      functionName: "setTaxWallet",
      args: [slot, value as `0x${string}`],
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax wallet addresses</CardTitle>
        <CardDescription>
          Tax rates and allocation percentages are fixed at deployment. Only recipient wallet
          addresses can be updated here after launch.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeSlots.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tax allocation slots are enabled on this token.</p>
        ) : (
          activeSlots.map((walletKey) => {
            const bpsKey = `${walletKey.replace("Wallet", "Bps")}` as keyof TaxDistribution;
            const bps = taxDist ? Number(taxDist[bpsKey] ?? 0) : 0;
            const slot = TAX_WALLET_SLOTS[walletKey];
            const saved = currentWallet(walletKey);
            const draft = drafts[walletKey] ?? saved;

            return (
              <div key={walletKey} className="rounded-lg border p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="mb-0">{TAX_WALLET_LABELS[walletKey]}</Label>
                  <span className="text-xs text-muted-foreground">{(bps / 100).toFixed(2)}% of tax</span>
                </div>
                <Input
                  value={draft}
                  onChange={(e) => setDrafts({ ...drafts, [walletKey]: e.target.value })}
                  placeholder="0x..."
                  disabled={!isOwner || renounced}
                />
                {saved ? (
                  <p className="text-xs text-muted-foreground">Current: {saved}</p>
                ) : (
                  <p className="text-xs text-amber-700">Not set — tax share is held until you assign a wallet.</p>
                )}
                <Button
                  size="sm"
                  disabled={
                    !isOwner ||
                    renounced ||
                    !isAddress(draft) ||
                    draft.toLowerCase() === saved.toLowerCase() ||
                    isPending ||
                    confirming
                  }
                  onClick={() => saveWallet(walletKey)}
                >
                  {pendingSlot === slot && (isPending || confirming) ? "Saving..." : "Save wallet"}
                </Button>
              </div>
            );
          })
        )}
        {!isOwner && !renounced && (
          <p className="text-sm text-muted-foreground">Connect the token owner wallet to update tax recipients.</p>
        )}
        {renounced && (
          <p className="text-sm text-muted-foreground">Ownership renounced — tax wallets can no longer be changed.</p>
        )}
      </CardContent>
    </Card>
  );
}
