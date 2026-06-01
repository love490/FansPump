"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import { shortenAddress } from "@/lib/utils";
import { isValidTokenAddress } from "@/lib/swap/routerAdapter";

type SearchToken = {
  contractAddress: string;
  name: string;
  symbol: string;
  logoUrl?: string | null;
};

export function TokenSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchToken[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/tokens?q=${encodeURIComponent(q)}&limit=12`)
        .then((r) => r.json())
        .then((d) => setResults(d.tokens ?? []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [query, open]);

  function close() {
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  function goToToken(address: string) {
    close();
    router.push(`/token/${address}`);
  }

  const trimmed = query.trim();
  const showAddressOption = isValidTokenAddress(trimmed) && !results.some(
    (t) => t.contractAddress.toLowerCase() === trimmed.toLowerCase()
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-input bg-background text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        aria-label="Search tokens"
      >
        <Search className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[110] flex items-start justify-center p-4 pt-[max(1rem,10vh)] sm:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={close}
            aria-label="Close search"
          />
          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border bg-background shadow-2xl">
            <div className="flex items-center gap-2 border-b px-3 py-2">
              <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, symbol, or contract address…"
                className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={close}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[min(60vh,24rem)] overflow-y-auto p-2">
              {loading && (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching…
                </div>
              )}

              {!loading && trimmed.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  Type to search tokens on FansPump
                </p>
              )}

              {!loading && trimmed.length > 0 && results.length === 0 && !showAddressOption && (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">No tokens found</p>
              )}

              {showAddressOption && (
                <button
                  type="button"
                  onClick={() => goToToken(trimmed)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                    0x
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">View contract</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">{trimmed}</p>
                  </div>
                </button>
              )}

              {results.map((token) => (
                <button
                  key={token.contractAddress}
                  type="button"
                  onClick={() => goToToken(token.contractAddress)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted"
                >
                  {token.logoUrl ? (
                    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg">
                      <Image src={token.logoUrl} alt="" fill className="object-cover" unoptimized />
                    </div>
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      {token.symbol.slice(0, 2)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {token.name}{" "}
                      <span className="text-muted-foreground">({token.symbol})</span>
                    </p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {shortenAddress(token.contractAddress, 6)}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="border-t px-3 py-2 text-center">
              <Link
                href="/discover"
                onClick={close}
                className="text-xs font-medium text-primary hover:underline"
              >
                Browse all tokens →
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
