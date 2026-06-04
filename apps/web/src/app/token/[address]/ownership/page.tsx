"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { tokenAbi } from "@/lib/abis/factory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TaxWalletManager } from "@/components/token/tax-wallet-manager";
import { AlertTriangle } from "lucide-react";

export default function OwnershipPage() {
  const params = useParams();
  const tokenAddress = params.address as `0x${string}`;
  const { address } = useAccount();
  const [newOwner, setNewOwner] = useState("");
  const [confirmRenounce, setConfirmRenounce] = useState(false);

  const { data: owner } = useReadContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: "owner",
  });

  const { data: renounced } = useReadContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: "isOwnershipRenounced",
  });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading } = useWaitForTransactionReceipt({ hash });

  const isOwner = address && owner && address.toLowerCase() === (owner as string).toLowerCase();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-2">Ownership Management</h1>
      <p className="text-muted-foreground mb-8">
        Transfer or permanently renounce contract ownership. Renounce is irreversible.
      </p>

      {renounced ? (
        <Card className="border-muted">
          <CardContent className="pt-6 text-muted-foreground">
            Ownership has been renounced. No further ownership actions are possible.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <TaxWalletManager
            tokenAddress={tokenAddress}
            isOwner={Boolean(isOwner)}
            renounced={Boolean(renounced)}
          />

          <Card>
            <CardHeader>
              <CardTitle>Transfer ownership</CardTitle>
              <CardDescription>Assign contract control to a new wallet address</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>New owner address</Label>
                <Input value={newOwner} onChange={(e) => setNewOwner(e.target.value)} placeholder="0x..." />
              </div>
              <Button
                disabled={!isOwner || !newOwner || isPending || isLoading}
                onClick={() =>
                  writeContract({
                    address: tokenAddress,
                    abi: tokenAbi,
                    functionName: "transferOwnership",
                    args: [newOwner as `0x${string}`],
                  })
                }
              >
                Transfer ownership
              </Button>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Renounce ownership
              </CardTitle>
              <CardDescription>
                Permanently remove all owner privileges. This cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={confirmRenounce} onChange={(e) => setConfirmRenounce(e.target.checked)} />
                I understand this action is irreversible
              </label>
              <Button
                variant="destructive"
                disabled={!isOwner || !confirmRenounce || isPending || isLoading}
                onClick={() =>
                  writeContract({
                    address: tokenAddress,
                    abi: tokenAbi,
                    functionName: "renounceOwnership",
                  })
                }
              >
                Renounce ownership permanently
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
