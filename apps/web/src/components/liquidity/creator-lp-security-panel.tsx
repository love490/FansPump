"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { Flame, Lock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LIQUIDITY_PAIR_OPTIONS } from "@/lib/liquidity/pair-tokens";
import { LIQUIDITY_LOCKER_ADDRESS } from "@/lib/liquidity/constants";
import { getOrCreateBurnAddress } from "@/lib/liquidity/burn-address";
import { shortenAddress } from "@/lib/utils";

function isLockerConfigured() {
  return (
    LIQUIDITY_LOCKER_ADDRESS.toLowerCase() !== "0x0000000000000000000000000000000000000000"
  );
}

type Props = {
  tokenAddress: string;
};

export function CreatorLpSecurityPanel({ tokenAddress }: Props) {
  const { address } = useAccount();
  const burnAddress =
    address && tokenAddress ? getOrCreateBurnAddress(tokenAddress, address) : null;
  const lockerReady = isLockerConfigured();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lock &amp; burn liquidity</CardTitle>
        <CardDescription>
          After adding liquidity, secure your LP to build community trust. Choose a pair to manage.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-3">
          {LIQUIDITY_PAIR_OPTIONS.map((pair) => (
            <Button key={pair.id} asChild variant="outline" className="justify-between">
              <Link href={`/liquidity/${tokenAddress}?pair=${pair.id}`}>
                <span>{pair.symbol} pair</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ))}
        </div>

        <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 text-sm md:grid-cols-2">
          <div className="flex gap-3">
            <Flame className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div>
              <p className="font-medium">Burn LP</p>
              <p className="mt-1 text-muted-foreground">
                Permanently send LP to a unique burn wallet generated for your token.
              </p>
              {burnAddress && (
                <p className="mt-2 font-mono text-xs">{shortenAddress(burnAddress, 8)}</p>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium">Lock LP</p>
              {lockerReady ? (
                <p className="mt-1 text-muted-foreground">
                  Time-lock LP in the on-chain locker contract until your chosen unlock date.
                </p>
              ) : (
                <p className="mt-1 text-amber-800">
                  Locker contract not deployed yet. Set{" "}
                  <code className="text-xs">NEXT_PUBLIC_LIQUIDITY_LOCKER_ADDRESS</code> after
                  deploying FansPumpLiquidityLocker.
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
