"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { shortenAddress, cn } from "@/lib/utils";
import { isValidTokenAddress } from "@/lib/swap/routerAdapter";
import { usePublicClient } from "wagmi";
import { erc20Abi } from "@/lib/swap/abis";
import type { Address } from "viem";

type SwapToken = {
  contractAddress: string;
  name: string;
  symbol: string;
  logoUrl?: string | null;
};

type SwapTokenPickerProps = {
  value: string;
  onChange: (address: string) => void;
};

export function SwapTokenPicker({ value, onChange }: SwapTokenPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SwapToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SwapToken | null>(null);
  const [resolutionDone, setResolutionDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const validAddress = isValidTokenAddress(value);
  const client = usePublicClient();

  useEffect(() => {
    if (!value || !validAddress) {
      setSelected(null);
      setResolutionDone(false);
      return;
    }
    if (selected?.contractAddress.toLowerCase() === value.toLowerCase()) return;

    setResolutionDone(false);
    let cancelled = false;

    if (!client) {
      setSelected(null);
      setResolutionDone(true);
      return;
    }

    fetch(`/api/tokens/${value}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        if (d?.token) {
          setSelected({
            contractAddress: d.token.contractAddress,
            name: d.token.name,
            symbol: d.token.symbol,
            logoUrl: d.token.logoUrl,
          });
          setResolutionDone(true);
          return;
        }

        // Fallback: if token isn't in our DB, still resolve symbol from the chain.
        // This makes OPN/OPN V2 work even if they haven't been indexed yet.
        (async () => {
          try {
            const addr = value.toLowerCase() as Address;
            const [symbol] = await Promise.all([
              client.readContract({
                address: addr,
                abi: erc20Abi,
                functionName: "symbol",
              }),
            ]);
            if (cancelled) return;
            const sym = String(symbol);
            setSelected({
              contractAddress: addr,
              name: sym,
              symbol: sym,
              logoUrl: null,
            });
          } catch {
            if (cancelled) return;
            setSelected(null);
          } finally {
            if (!cancelled) setResolutionDone(true);
          }
        })();
      })
      .catch(() => {
        if (cancelled) return;
        setSelected(null);
        setResolutionDone(true);
      });

    return () => {
      cancelled = true;
    };
  }, [value, validAddress, selected?.contractAddress, client]);

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
      if (isValidTokenAddress(q)) {
        fetch(`/api/tokens/${q}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (d?.token) {
              setResults([
                {
                  contractAddress: d.token.contractAddress,
                  name: d.token.name,
                  symbol: d.token.symbol,
                  logoUrl: d.token.logoUrl,
                },
              ]);
            } else {
              setResults([]);
            }
          })
          .catch(() => setResults([]))
          .finally(() => setLoading(false));
        return;
      }

      fetch(`/api/tokens?q=${encodeURIComponent(q)}&limit=20`)
        .then((r) => r.json())
        .then((d) => setResults(d.tokens ?? []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [query, open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayLabel = useMemo(() => {
    if (selected) return `${selected.name} (${selected.symbol})`;
    if (validAddress) {
      if (resolutionDone) return "No token found";
      return shortenAddress(value, 6);
    }
    return "";
  }, [selected, validAddress, value, resolutionDone]);

  function pickToken(token: SwapToken) {
    onChange(token.contractAddress);
    setSelected(token);
    setQuery("");
    setOpen(false);
  }

  function clearSelection() {
    onChange("");
    setSelected(null);
    setQuery("");
  }

  function applyManualAddress() {
    const trimmed = query.trim();
    if (!isValidTokenAddress(trimmed)) return;
    onChange(trimmed);
    setSelected(null);
    setResolutionDone(false);
    setQuery("");
    setOpen(false);
  }

  const showManualHint =
    query.trim().length > 0 && isValidTokenAddress(query.trim()) && results.length === 0 && !loading;

  return (
    <div ref={containerRef} className="space-y-2">
      <Label>Token</Label>

      {value && validAddress ? (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
          {selected?.logoUrl ? (
            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md">
              <Image src={selected.logoUrl} alt="" fill className="object-cover" unoptimized />
            </div>
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
              {(selected?.symbol ?? value).slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{displayLabel}</p>
            {resolutionDone && !selected ? null : (
              <p className="truncate font-mono text-xs text-muted-foreground">{value}</p>
            )}
          </div>
          <button
            type="button"
            onClick={clearSelection}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Clear token"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search by name, symbol, or contract address (0x…)"
            className="pl-9"
          />

          {open && (query.trim().length > 0 || loading) && (
            <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border bg-popover shadow-lg">
              {loading && <p className="px-3 py-2 text-sm text-muted-foreground">Searching…</p>}
              {!loading && results.length === 0 && !showManualHint && (
                <p className="px-3 py-2 text-sm text-muted-foreground">No tokens found</p>
              )}
              {showManualHint && (
                <button
                  type="button"
                  onClick={applyManualAddress}
                  className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  <span className="font-medium">Use contract address</span>
                  <span className="font-mono text-xs text-muted-foreground">{query.trim()}</span>
                </button>
              )}

              {results.map((token) => (
                <button
                  key={token.contractAddress}
                  type="button"
                  onClick={() => pickToken(token)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted"
                >
                  {token.logoUrl ? (
                    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md">
                      <Image src={token.logoUrl} alt="" fill className="object-cover" unoptimized />
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                      {token.symbol.slice(0, 2)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {token.name} <span className="text-muted-foreground">({token.symbol})</span>
                    </p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {shortenAddress(token.contractAddress, 6)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {value && !validAddress && (
        <p className="text-xs text-red-600">Invalid or unsupported token address</p>
      )}
    </div>
  );
}
