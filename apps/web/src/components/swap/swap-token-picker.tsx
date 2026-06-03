"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ChevronDown, Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { shortenAddress, cn } from "@/lib/utils";
import { isValidTokenAddress } from "@/lib/swap/routerAdapter";
import { resolveTokenByAddress } from "@/lib/token-resolve";
import {
  getPopularRegistryTokens,
  mergeSwapTokenLists,
  registryToSwapToken,
  searchRegistryTokens,
} from "@/lib/token-registry";
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
  label?: string;
};

function TokenAvatar({ token, size = "md" }: { token: SwapToken; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const text = size === "sm" ? "text-[10px]" : "text-xs";

  if (token.logoUrl) {
    return (
      <div className={cn("relative shrink-0 overflow-hidden rounded-full", dim)}>
        <Image src={token.logoUrl} alt="" fill className="object-cover" unoptimized />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary",
        dim,
        text
      )}
    >
      {token.symbol.slice(0, 2).toUpperCase()}
    </div>
  );
}

function TokenRow({
  token,
  onPick,
  active,
}: {
  token: SwapToken;
  onPick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted/60",
        active && "bg-primary/10"
      )}
    >
      <TokenAvatar token={token} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {token.symbol}
          <span className="ml-1.5 font-normal text-muted-foreground">{token.name}</span>
        </p>
        <p className="truncate font-mono text-xs text-muted-foreground">
          {shortenAddress(token.contractAddress, 6)}
        </p>
      </div>
    </button>
  );
}

export function SwapTokenPicker({ value, onChange, label = "Token" }: SwapTokenPickerProps) {
  const [query, setQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [results, setResults] = useState<SwapToken[]>([]);
  const [quickTokens, setQuickTokens] = useState<SwapToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [quickLoading, setQuickLoading] = useState(false);
  const [selected, setSelected] = useState<SwapToken | null>(null);
  const [resolutionDone, setResolutionDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validAddress = isValidTokenAddress(value);
  const client = usePublicClient();
  const hasSelection = Boolean(value && validAddress && selected);

  const showSearchResults = pickerOpen && !quickOpen && query.trim().length > 0;
  const dropdownOpen = quickOpen || showSearchResults;

  useEffect(() => {
    if (!value || !validAddress) {
      setSelected(null);
      setResolutionDone(false);
      if (!value) setPickerOpen(true);
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
          setPickerOpen(false);
          return;
        }

        (async () => {
          try {
            const addr = value.toLowerCase() as Address;
            const symbol = await client.readContract({
              address: addr,
              abi: erc20Abi,
              functionName: "symbol",
            });
            if (cancelled) return;
            const sym = String(symbol);
            setSelected({
              contractAddress: addr,
              name: sym,
              symbol: sym,
              logoUrl: null,
            });
            setPickerOpen(false);
          } catch {
            if (!cancelled) setSelected(null);
          } finally {
            if (!cancelled) setResolutionDone(true);
          }
        })();
      })
      .catch(() => {
        if (!cancelled) {
          setSelected(null);
          setResolutionDone(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [value, validAddress, selected?.contractAddress, client]);

  useEffect(() => {
    if (!quickOpen) return;
    if (quickTokens.length > 0) return;
    setQuickLoading(true);
    const popular = getPopularRegistryTokens()
      .map(registryToSwapToken)
      .filter((t): t is SwapToken => t !== null);
    setQuickTokens(popular);
    setQuickLoading(false);
  }, [quickOpen, quickTokens.length]);

  useEffect(() => {
    if (!pickerOpen || quickOpen || query.trim().length < 1) {
      setResults([]);
      setLoading(false);
      return;
    }

    const q = query.trim();
    const timer = setTimeout(async () => {
      setLoading(true);
      if (isValidTokenAddress(q)) {
        const resolved = await resolveTokenByAddress(q, client ?? undefined);
        setResults(resolved ? [resolved] : []);
        setLoading(false);
        return;
      }

      const registryHits = searchRegistryTokens(q)
        .map(registryToSwapToken)
        .filter((t): t is SwapToken => t !== null);

      fetch(`/api/tokens?q=${encodeURIComponent(q)}&limit=20&chainId=984`)
        .then((r) => r.json())
        .then((d) => {
          const fromApi = (d.tokens ?? []) as SwapToken[];
          setResults(mergeSwapTokenLists(registryHits, fromApi));
        })
        .catch(() => setResults(registryHits))
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [query, pickerOpen, quickOpen, client]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
        setQuickOpen(false);
        if (hasSelection) setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [hasSelection]);

  useEffect(() => {
    if (pickerOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [pickerOpen]);

  const filteredQuick = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return quickTokens;
    return quickTokens.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.symbol.toLowerCase().includes(q) ||
        t.contractAddress.toLowerCase().includes(q)
    );
  }, [quickTokens, query]);

  function pickToken(token: SwapToken) {
    onChange(token.contractAddress);
    setSelected(token);
    setQuery("");
    setPickerOpen(false);
    setQuickOpen(false);
    setResolutionDone(true);
  }

  function openPicker() {
    setPickerOpen(true);
    setQuery("");
  }

  function clearSelection() {
    onChange("");
    setSelected(null);
    setQuery("");
    setResolutionDone(false);
    setPickerOpen(true);
  }

  function applyManualAddress() {
    const trimmed = query.trim();
    if (!isValidTokenAddress(trimmed)) return;
    onChange(trimmed);
    setSelected(null);
    setResolutionDone(false);
    setQuery("");
    setPickerOpen(false);
    setQuickOpen(false);
  }

  const showManualHint =
    showSearchResults &&
    query.trim().length > 0 &&
    isValidTokenAddress(query.trim()) &&
    results.length === 0 &&
    !loading;

  const activeAddress = value?.toLowerCase();

  return (
    <div ref={containerRef} className="space-y-2">
      <Label>{label}</Label>

      {hasSelection && !pickerOpen ? (
        <button
          type="button"
          onClick={openPicker}
          className="flex w-full items-center gap-2.5 rounded-lg border border-border/50 bg-transparent px-3 py-2.5 text-left transition-colors hover:border-border hover:bg-muted/30"
          aria-label={`Change token: ${selected!.symbol}`}
        >
          <TokenAvatar token={selected!} size="sm" />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{selected!.symbol}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      ) : (
        <div className="relative">
          <div className="flex gap-1">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (!quickOpen) setPickerOpen(true);
                }}
                onFocus={() => {
                  if (!quickOpen) setPickerOpen(true);
                }}
                placeholder="Search name, symbol, or address…"
                className="border-border/50 bg-transparent pl-9 pr-2 shadow-none focus-visible:ring-1"
                aria-expanded={pickerOpen || quickOpen}
                aria-autocomplete="list"
              />
            </div>
            {hasSelection && (
              <button
                type="button"
                onClick={clearSelection}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border/50 bg-transparent text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                aria-label="Clear token"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setQuickOpen((v) => !v);
                setPickerOpen(false);
              }}
              className={cn(
                "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border/50 bg-transparent text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground",
                quickOpen && "border-primary/50 text-primary"
              )}
              aria-label="Choose token from list"
              aria-expanded={quickOpen}
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform", quickOpen && "rotate-180")} />
            </button>
          </div>

          {dropdownOpen && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border/60 bg-popover/95 shadow-lg backdrop-blur-sm">
              {quickOpen && (
                <>
                  <div className="border-b border-border/50 px-3 py-2 text-xs font-medium text-muted-foreground">
                    Popular tokens
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    {quickLoading ? (
                      <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading tokens…
                      </div>
                    ) : filteredQuick.length === 0 ? (
                      <p className="px-3 py-3 text-sm text-muted-foreground">No matching token found.</p>
                    ) : (
                      filteredQuick.map((token) => (
                        <TokenRow
                          key={`quick-${token.contractAddress}`}
                          token={token}
                          active={activeAddress === token.contractAddress.toLowerCase()}
                          onPick={() => pickToken(token)}
                        />
                      ))
                    )}
                  </div>
                </>
              )}

              {showSearchResults && (
                <>
                  {quickOpen && <div className="border-b border-border/50" />}
                  <div className="max-h-52 overflow-y-auto">
                    {loading && (
                      <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Searching…
                      </div>
                    )}
                    {!loading && results.length === 0 && !showManualHint && (
                      <p className="px-3 py-3 text-sm text-muted-foreground">No matching token found.</p>
                    )}
                    {showManualHint && (
                      <button
                        type="button"
                        onClick={applyManualAddress}
                        className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted/60"
                      >
                        <span className="font-medium">Use contract address</span>
                        <span className="font-mono text-xs text-muted-foreground">{query.trim()}</span>
                      </button>
                    )}
                    {results.map((token) => (
                      <TokenRow
                        key={token.contractAddress}
                        token={token}
                        active={activeAddress === token.contractAddress.toLowerCase()}
                        onPick={() => pickToken(token)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {value && validAddress && !selected && resolutionDone && (
        <p className="text-sm text-muted-foreground">No token found for this address.</p>
      )}

      {value && !validAddress && (
        <p className="text-xs text-red-600">Invalid or unsupported token address</p>
      )}
    </div>
  );
}
