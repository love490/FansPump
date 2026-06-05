"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ChevronDown, Loader2, Search } from "lucide-react";
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

export type SwapToken = {
  contractAddress: string;
  name: string;
  symbol: string;
  logoUrl?: string | null;
};

type SwapTokenPickerProps = {
  value: string;
  onChange: (address: string) => void;
  label?: string;
  /** Compact pill for inline use in From/To rows */
  variant?: "default" | "pill";
  placeholder?: string;
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
        "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/60",
        active && "bg-primary/10"
      )}
    >
      <TokenAvatar token={token} size="sm" />
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

export function SwapTokenPicker({
  value,
  onChange,
  label,
  variant = "default",
  placeholder = "Select token",
}: SwapTokenPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [allTokens, setAllTokens] = useState<SwapToken[]>([]);
  const [searchResults, setSearchResults] = useState<SwapToken[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [selected, setSelected] = useState<SwapToken | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const client = usePublicClient();

  const validAddress = isValidTokenAddress(value);
  const activeAddress = value?.toLowerCase();

  useEffect(() => {
    if (!value || !validAddress) {
      setSelected(null);
      return;
    }
    if (selected?.contractAddress.toLowerCase() === value.toLowerCase()) return;

    let cancelled = false;
    resolveTokenByAddress(value, client ?? undefined).then((t) => {
      if (!cancelled && t) setSelected(t);
    });
    return () => {
      cancelled = true;
    };
  }, [value, validAddress, selected?.contractAddress, client]);

  useEffect(() => {
    if (!open) return;
    if (allTokens.length > 0) return;

    setListLoading(true);
    const popular = getPopularRegistryTokens()
      .map(registryToSwapToken)
      .filter((t): t is SwapToken => t !== null);

    fetch("/api/tokens?section=new&limit=100")
      .then((r) => r.json())
      .then((d) => {
        const fromApi = (d.tokens ?? []) as SwapToken[];
        setAllTokens(mergeSwapTokenLists(popular, fromApi));
      })
      .catch(() => setAllTokens(popular))
      .finally(() => setListLoading(false));
  }, [open, allTokens.length]);

  useEffect(() => {
    if (!open) {
      setSearchResults(null);
      setLoading(false);
      return;
    }

    const q = query.trim();
    if (!q) {
      setSearchResults(null);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      if (isValidTokenAddress(q)) {
        const resolved = await resolveTokenByAddress(q, client ?? undefined);
        setSearchResults(resolved ? [resolved] : []);
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
          setSearchResults(mergeSwapTokenLists(registryHits, fromApi));
        })
        .catch(() => setSearchResults(registryHits))
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [query, open, client]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => searchRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayedTokens = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = searchResults ?? allTokens;
    if (!q || searchResults) return base;
    return base.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.symbol.toLowerCase().includes(q) ||
        t.contractAddress.toLowerCase().includes(q)
    );
  }, [allTokens, searchResults, query]);

  function pickToken(token: SwapToken) {
    onChange(token.contractAddress);
    setSelected(token);
    setOpen(false);
    setQuery("");
  }

  function applyManualAddress() {
    const trimmed = query.trim();
    if (!isValidTokenAddress(trimmed)) return;
    onChange(trimmed);
    setSelected(null);
    setOpen(false);
    setQuery("");
  }

  const showManualHint =
    query.trim().length > 0 &&
    isValidTokenAddress(query.trim()) &&
    !loading &&
    displayedTokens.length === 0;

  const triggerClass =
    variant === "pill"
      ? "flex h-10 shrink-0 items-center gap-2 rounded-full border border-border bg-muted/40 px-3 text-sm font-semibold hover:bg-muted"
      : "flex w-full items-center gap-2.5 rounded-lg border border-border/50 bg-transparent px-3 py-2.5 text-left transition-colors hover:border-border hover:bg-muted/30";

  return (
    <div ref={containerRef} className={cn("relative", variant === "default" && "space-y-2")}>
      {label && variant === "default" && (
        <p className="text-sm font-medium leading-none">{label}</p>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={triggerClass}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {selected ? (
          <>
            <TokenAvatar token={selected} size="sm" />
            <span className="truncate">{selected.symbol}</span>
          </>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          className={cn(
            "z-50 overflow-hidden rounded-lg border border-border/60 bg-popover shadow-lg",
            variant === "pill"
              ? "absolute right-0 top-full mt-1 w-72"
              : "absolute left-0 right-0 top-full mt-1"
          )}
        >
          <div className="border-b border-border/50 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, symbol, or address…"
                className="w-full rounded-md border bg-background py-2 pl-8 pr-2 text-sm outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto py-1">
            {listLoading && !query.trim() ? (
              <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading tokens…
              </div>
            ) : loading ? (
              <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching…
              </div>
            ) : displayedTokens.length === 0 && !showManualHint ? (
              <p className="px-3 py-3 text-sm text-muted-foreground">No matching token found.</p>
            ) : (
              <>
                {!query.trim() && (
                  <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground">All tokens</p>
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
                {displayedTokens.map((token) => (
                  <TokenRow
                    key={token.contractAddress}
                    token={token}
                    active={activeAddress === token.contractAddress.toLowerCase()}
                    onPick={() => pickToken(token)}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {value && validAddress && !selected && (
        <p className="text-xs text-muted-foreground">Resolving token…</p>
      )}
      {value && !validAddress && variant === "default" && (
        <p className="text-xs text-red-600">Invalid token address</p>
      )}
    </div>
  );
}
