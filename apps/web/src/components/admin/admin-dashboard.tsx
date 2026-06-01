"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FactoryControls } from "@/components/admin/factory-controls";
import {
  adminFetch,
  clearAdminSession,
  getAdminSession,
  setAdminSession,
} from "@/lib/admin-session";
import { buildAdminAuthMessage } from "@/lib/admin-auth";
import { Shield, Star, LogOut, Search } from "lucide-react";

interface AdminToken {
  id: string;
  name: string;
  symbol: string;
  contractAddress: string;
  isFeatured: boolean;
  trendingScore: number;
  viewCount: number;
  creatorVerified?: boolean;
}

interface Stats {
  tokenCount: number;
  userCount: number;
  featuredCount: number;
  verificationCount: number;
  voteCount: number;
}

export function AdminDashboard() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isFactoryAdmin, setIsFactoryAdmin] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tokens, setTokens] = useState<AdminToken[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!address) {
      setIsAdmin(false);
      setIsFactoryAdmin(false);
      setAuthorized(false);
      return;
    }
    fetch(`/api/admin/check?wallet=${address}`)
      .then((r) => r.json())
      .then((d) => setIsAdmin(d.isAdmin));
    fetch(`/api/admin/factory-admin?wallet=${address}`)
      .then((r) => r.json())
      .then((d) => setIsFactoryAdmin(d.isFactoryAdmin));
    const session = getAdminSession();
    setAuthorized(!!session && session.walletAddress.toLowerCase() === address.toLowerCase());
  }, [address]);

  const loadData = useCallback(async () => {
    const [statsRes, tokensRes] = await Promise.all([
      adminFetch("/api/admin/stats"),
      adminFetch(`/api/admin/tokens${query ? `?q=${encodeURIComponent(query)}` : ""}`),
    ]);
    if (statsRes.ok) {
      const d = await statsRes.json();
      setStats(d.stats);
    }
    if (tokensRes.ok) {
      const d = await tokensRes.json();
      setTokens(d.tokens);
    }
  }, [query]);

  useEffect(() => {
    if (authorized) loadData();
  }, [authorized, loadData]);

  async function authorize() {
    if (!address) return;
    setLoading(true);
    try {
      const message = buildAdminAuthMessage(address);
      const signature = await signMessageAsync({ message });
      const res = await fetch("/api/admin/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, signature, message }),
      });
      if (res.ok) {
        setAdminSession({ walletAddress: address, signature, message });
        setAuthorized(true);
      }
    } finally {
      setLoading(false);
    }
  }

  function signOut() {
    clearAdminSession();
    setAuthorized(false);
    setStats(null);
    setTokens([]);
  }

  async function toggleFeatured(token: AdminToken) {
    await adminFetch(`/api/admin/tokens/${token.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isFeatured: !token.isFeatured }),
    });
    loadData();
  }

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Connect an admin wallet to access the dashboard.
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <Card className="border-red-200">
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground">This wallet is not in the admin allowlist.</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Set <code className="rounded bg-muted px-1">ADMIN_WALLET_ADDRESSES</code> in your server env.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!authorized) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-iopn-600" /> Admin authorization
          </CardTitle>
          <CardDescription>
            Sign a message to prove you control this admin wallet. Session lasts 24 hours.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={authorize} disabled={loading}>
            {loading ? "Signing..." : "Sign in as admin"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Signed in as <span className="font-mono">{address}</span>
        </p>
        <Button variant="outline" size="sm" onClick={signOut}>
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Tokens", stats.tokenCount],
            ["Users", stats.userCount],
            ["Featured", stats.featuredCount],
            ["Verified creators", stats.verificationCount],
            ["Votes", stats.voteCount],
          ].map(([label, value]) => (
            <Card key={label as string}>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <FactoryControls isFactoryAdmin={isFactoryAdmin} />

      <Card>
        <CardHeader>
          <CardTitle>Discovery curation</CardTitle>
          <CardDescription>Feature projects for the Featured section on Discover</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search name, symbol, address..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadData()}
            />
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>
            Search / refresh
          </Button>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left">
                <tr>
                  <th className="p-3 font-medium">Project</th>
                  <th className="p-3 font-medium">Views</th>
                  <th className="p-3 font-medium">Featured</th>
                  <th className="p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tokens.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-muted-foreground">
                      No tokens found
                    </td>
                  </tr>
                ) : (
                  tokens.map((t) => (
                    <tr key={t.id} className="border-b last:border-0">
                      <td className="p-3">
                        <Link href={`/token/${t.contractAddress}`} className="font-medium hover:text-iopn-600">
                          {t.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{t.symbol}</p>
                      </td>
                      <td className="p-3">{t.viewCount}</td>
                      <td className="p-3">
                        {t.isFeatured ? (
                          <Badge variant="default">Featured</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <Button size="sm" variant="outline" onClick={() => toggleFeatured(t)}>
                          <Star className="h-3.5 w-3.5" />
                          {t.isFeatured ? "Unfeature" : "Feature"}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
