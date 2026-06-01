"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseEther } from "viem";
import { tokenAbi, liquidityRouterAbi } from "@/lib/abis/factory";
import { LIQUIDITY_ROUTER_ADDRESS } from "@/lib/wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LiquidityPage() {
  const params = useParams();
  const tokenAddress = params.address as `0x${string}`;
  const { address, isConnected } = useAccount();
  const [tokenAmount, setTokenAmount] = useState("1000");
  const [ethAmount, setEthAmount] = useState("1");
  const [router, setRouter] = useState<"primary" | "uniswap">("primary");

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading } = useWaitForTransactionReceipt({ hash });

  const { data: balance } = useReadContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  function approve() {
    writeContract({
      address: tokenAddress,
      abi: tokenAbi,
      functionName: "approve",
      args: [LIQUIDITY_ROUTER_ADDRESS, parseEther(tokenAmount)],
    });
  }

  function addLiquidity() {
    const fn = router === "primary" ? "addLiquidityViaPrimary" : "addLiquidityViaUniswap";
    writeContract({
      address: LIQUIDITY_ROUTER_ADDRESS,
      abi: liquidityRouterAbi,
      functionName: fn,
      args: [tokenAddress, parseEther(tokenAmount), 0n, 0n],
      value: parseEther(ethAmount),
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-2">Liquidity Management</h1>
      <p className="text-muted-foreground mb-8">
        Approve your token and add liquidity via IOPn primary platform or Uniswap-compatible routers.
        FansPump does not operate its own DEX.
      </p>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Your token balance</p>
          <p className="text-xl font-mono">{balance?.toString() ?? "—"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add liquidity</CardTitle>
          <CardDescription>Step 1: Approve · Step 2: Add liquidity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Router</Label>
            <select
              className="flex h-10 w-full rounded-md border px-3 text-sm"
              value={router}
              onChange={(e) => setRouter(e.target.value as "primary" | "uniswap")}
            >
              <option value="primary">IOPn Primary Liquidity</option>
              <option value="uniswap">Uniswap-compatible (future-ready)</option>
            </select>
          </div>
          <div>
            <Label>Token amount</Label>
            <Input value={tokenAmount} onChange={(e) => setTokenAmount(e.target.value)} />
          </div>
          <div>
            <Label>ETH amount</Label>
            <Input value={ethAmount} onChange={(e) => setEthAmount(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={approve} disabled={!isConnected || isPending || isLoading}>
              Approve token
            </Button>
            <Button onClick={addLiquidity} disabled={!isConnected || isPending || isLoading}>
              Add liquidity
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
