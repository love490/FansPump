"use client";

import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { shortenAddress } from "@/lib/utils";
import { motion } from "framer-motion";
import { CheckCircle2, Eye, Users } from "lucide-react";

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
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-iopn-50">
              {token.logoUrl ? (
                <Image src={token.logoUrl} alt={token.name} fill className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-bold text-iopn-600">
                  {token.symbol.slice(0, 2)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="truncate text-lg">{token.name}</CardTitle>
                {token.isFeatured && <Badge variant="default">Featured</Badge>}
                {token.creatorVerified && (
                  <Badge variant="verified" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Verified
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
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" /> {token.viewCount}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> {token.holderCount}
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
