"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { shortenAddress, cn } from "@/lib/utils";
import { isValidTokenAddress } from "@/lib/swap/routerAdapter";

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
  const containerRef = useRef<HTMLDivElement>(null);

  const validAddress = isValidTokenAddress(value);

  useEffect(() => {
    if (!value || !validAddress) {
      setSelected(null);
      return;
    }
    if (selected?.contractAddress.toLowerCase() === value.toLowerCase()) return;

    fetch(`/api/tokens/${value}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.token) {
          setSelected({
            contractAddress: d.token.contractAddress,
            name: d.token.name,
            symbol: d.token.symbol,
            logoUrl: d.token.logoUrl,
          });
        } else {
          setSelected(null);
        }
      })
      .catch(() => setSelected(null));
  }, [value, validAddress, selected?.contractAddress]);

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
    if (validAddress) return shortenAddress(value, 6);
    return "";
  }, [selected, validAddress, value]);

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
            <p className="truncate font-mono text-xs text-muted-foreground">{value}</p>
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
              {!loading && results.length === 0 && (
                <p className="px-3 py-2 text-sm text-muted-foreground">No tokens found</p>
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
