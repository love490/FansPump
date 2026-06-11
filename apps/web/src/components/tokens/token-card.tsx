"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { shortenAddress } from "@/lib/utils";
import { motion } from "framer-motion";
import { TOKEN_CATEGORY_LABELS, type TokenCategoryId } from "@iopn/shared";
import { Activity, CheckCircle2, Eye, Lock, Users, TrendingUp, Droplets, Coins } from "lucide-react";
import { TokenLogo } from "@/components/tokens/token-logo";

export interface TokenCardData {
  id: string;
  contractAddress: string;
  name: string;
  symbol: string;
  logoUrl?: string | null;
  description?: string | null;
  viewCount: number;
  holderCount: number;
  creatorVerified?: boolean;
  isFeatured?: boolean;
  volume24h?: number;
  volumeTotal?: number;
  txCount24h?: number;
  poolStrength?: number;
  creatorEarningsWei?: string;
  category?: string;
  liquidityLocked?: boolean;
  ownershipRenounced?: boolean;
  createdAt?: string;
  creatorAddress?: string;
  creatorUsername?: string | null;
  marketCap?: number | null;
}

export function TokenCard({ token, index = 0 }: { token: TokenCardData; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/token/${token.contractAddress}`}>
        <Card className="group h-full transition-shadow hover:shadow-md hover:border-iopn-200">
          <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-2">
            <TokenLogo src={token.logoUrl} symbol={token.symbol} name={token.name} layout="fixed" size={48} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="truncate text-lg">{token.name}</CardTitle>
                {token.isFeatured && <Badge variant="default">Featured</Badge>}
                {token.creatorVerified && (
                  <Badge variant="verified" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Verified
                  </Badge>
                )}
                {token.category && token.category !== "OTHER" && (
                  <Badge variant="outline">
                    {TOKEN_CATEGORY_LABELS[token.category as TokenCategoryId] ?? token.category}
                  </Badge>
                )}
                {token.liquidityLocked && (
                  <Badge variant="secondary" className="gap-1">
                    <Lock className="h-3 w-3" /> LP Locked
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{token.symbol}</p>
            </div>
          </CardHeader>
          <CardContent>
            {token.description && (
              <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{token.description}</p>
            )}
            <p className="mb-3 font-mono text-xs text-muted-foreground">
              {shortenAddress(token.contractAddress)}
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1" title="Views">
                <Eye className="h-3.5 w-3.5" /> {token.viewCount}
              </span>
              <span className="flex items-center gap-1" title="Holders">
                <Users className="h-3.5 w-3.5" /> {token.holderCount}
              </span>
              <span className="flex items-center gap-1" title="24h volume">
                <TrendingUp className="h-3.5 w-3.5" /> {(token.volume24h ?? 0).toFixed(2)} vol
              </span>
              <span className="flex items-center gap-1" title="Pool strength">
                <Droplets className="h-3.5 w-3.5" /> {(token.poolStrength ?? 0).toFixed(0)} pool
              </span>
              <span className="flex items-center gap-1" title="24h transactions">
                <Activity className="h-3.5 w-3.5" /> {token.txCount24h ?? 0} tx
              </span>
              {token.creatorEarningsWei && token.creatorEarningsWei !== "0" && (
                <span className="flex items-center gap-1" title="Creator earnings">
                  <Coins className="h-3.5 w-3.5" /> earnings
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
