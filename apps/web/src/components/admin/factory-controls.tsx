"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatEther, parseEther } from "viem";
import { factoryAbi } from "@/lib/abis/factory";
import { FACTORY_ADDRESS } from "@/lib/wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TOKEN_CREATION_BASE_FEE, TOKEN_CREATION_FEE_SYMBOL } from "@iopn/shared";

interface FactoryControlsProps {
  isFactoryAdmin: boolean;
}

export function FactoryControls({ isFactoryAdmin }: FactoryControlsProps) {
  const [newFee, setNewFee] = useState(String(TOKEN_CREATION_BASE_FEE));
  const [newRecipient, setNewRecipient] = useState("");

  const { data: creationFee } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: factoryAbi,
    functionName: "creationFee",
  });
  const { data: feeRecipient } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: factoryAbi,
    functionName: "feeRecipient",
  });
  const { data: paused } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: factoryAbi,
    functionName: "paused",
  });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading } = useWaitForTransactionReceipt({ hash });

  if (!isFactoryAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Factory controls</CardTitle>
          <CardDescription>
            On-chain factory admin is a separate wallet (FACTORY_ADMIN_ADDRESS). Your admin wallet can
            curate discovery but cannot pause the factory unless it holds the contract admin role.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Factory controls</CardTitle>
        <CardDescription>On-chain admin actions for IOPnTokenFactory</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Status: </span>
            <span className={paused ? "text-red-600 font-medium" : "text-green-700 font-medium"}>
              {paused ? "Paused" : "Active"}
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">Creation fee: </span>
            {creationFee != null
              ? `${formatEther(creationFee)} ${TOKEN_CREATION_FEE_SYMBOL}`
              : "—"}
          </p>
          <p className="sm:col-span-2 font-mono text-xs break-all">
            <span className="text-muted-foreground">Fee recipient: </span>
            {feeRecipient as string}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 border-t pt-4">
          <Button
            variant="outline"
            disabled={isPending || isLoading || paused === true}
            onClick={() =>
              writeContract({ address: FACTORY_ADDRESS, abi: factoryAbi, functionName: "pauseFactory" })
            }
          >
            Pause factory
          </Button>
          <Button
            variant="outline"
            disabled={isPending || isLoading || paused === false}
            onClick={() =>
              writeContract({ address: FACTORY_ADDRESS, abi: factoryAbi, functionName: "unpauseFactory" })
            }
          >
            Unpause factory
          </Button>
        </div>

        <div className="grid gap-3 border-t pt-4 sm:grid-cols-2">
          <div>
            <Label>New creation fee ({TOKEN_CREATION_FEE_SYMBOL})</Label>
            <Input value={newFee} onChange={(e) => setNewFee(e.target.value)} />
            <Button
              className="mt-2"
              size="sm"
              disabled={isPending || isLoading}
              onClick={() =>
                writeContract({
                  address: FACTORY_ADDRESS,
                  abi: factoryAbi,
                  functionName: "setCreationFee",
                  args: [parseEther(newFee || "0")],
                })
              }
            >
              Update fee
            </Button>
          </div>
          <div>
            <Label>New fee recipient</Label>
            <Input value={newRecipient} onChange={(e) => setNewRecipient(e.target.value)} placeholder="0x..." />
            <Button
              className="mt-2"
              size="sm"
              disabled={isPending || isLoading || !newRecipient}
              onClick={() =>
                writeContract({
                  address: FACTORY_ADDRESS,
                  abi: factoryAbi,
                  functionName: "setFeeRecipient",
                  args: [newRecipient as `0x${string}`],
                })
              }
            >
              Update recipient
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
