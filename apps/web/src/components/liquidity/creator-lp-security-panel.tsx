"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { Flame, Lock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LIQUIDITY_PAIR_OPTIONS } from "@/lib/liquidity/pair-tokens";
import { LIQUIDITY_LOCKER_ADDRESS } from "@/lib/liquidity/constants";
import { getOrCreateBurnAddress } from "@/lib/liquidity/burn-address";
import { shortenAddress, cn } from "@/lib/utils";

function isLockerConfigured() {
  return (
    LIQUIDITY_LOCKER_ADDRESS.toLowerCase() !== "0x0000000000000000000000000000000000000000"
  );
}

type Props = {
  tokenAddress: string;
  defaultPairId?: string;
};

function SecurityActionCard({
  href,
  title,
  description,
  detail,
  icon: Icon,
  accent,
}: {
  href: string;
  title: string;
  description: string;
  detail?: string;
  icon: typeof Flame;
  accent: "burn" | "lock";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex gap-3 rounded-xl border border-border/60 bg-background/80 p-4 transition-all",
        "hover:border-primary/40 hover:bg-primary/5"
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 h-5 w-5 shrink-0",
          accent === "burn" ? "text-red-500" : "text-amber-600"
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        {detail && <p className="mt-2 font-mono text-xs">{detail}</p>}
        <span className="mt-3 inline-flex text-sm font-semibold tracking-widest text-primary transition-transform group-hover:translate-x-0.5">
          Manage &gt;&gt;&gt;
        </span>
      </div>
    </Link>
  );
}

export function CreatorLpSecurityPanel({ tokenAddress, defaultPairId = "OPN" }: Props) {
  const { address } = useAccount();
  const burnAddress =
    address && tokenAddress ? getOrCreateBurnAddress(tokenAddress, address) : null;
  const lockerReady = isLockerConfigured();
  const pairId =
    LIQUIDITY_PAIR_OPTIONS.find((p) => p.id === defaultPairId)?.id ?? LIQUIDITY_PAIR_OPTIONS[0].id;

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

        <div className="grid gap-3 md:grid-cols-2">
          <SecurityActionCard
            href={`/liquidity/${tokenAddress}?pair=${pairId}#burn`}
            title="Burn LP"
            description="Permanently send LP to a unique burn wallet generated for your token."
            detail={burnAddress ? shortenAddress(burnAddress, 8) : undefined}
            icon={Flame}
            accent="burn"
          />
          <SecurityActionCard
            href={`/liquidity/${tokenAddress}?pair=${pairId}#lock`}
            title="Lock LP"
            description={
              lockerReady
                ? "Time-lock LP in the on-chain locker contract until your chosen unlock date."
                : "LP locking is not available on this network yet."
            }
            icon={Lock}
            accent="lock"
          />
        </div>
      </CardContent>
    </Card>
  );
}
