"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ChevronDown, Loader2, Search } from "lucide-react";
import { useAccount, usePublicClient } from "wagmi";
import { formatUnits, type Address } from "viem";
import { cn } from "@/lib/utils";
import { isValidTokenAddress } from "@/lib/swap/routerAdapter";
import { resolveTokenByAddress } from "@/lib/token-resolve";
import {
  getPopularRegistryTokens,
  mergeSwapTokenLists,
  registryToSwapToken,
  searchRegistryTokens,
} from "@/lib/token-registry";
import { erc20Abi } from "@/lib/swap/abis";
import { SwapDropdownPortal } from "@/components/swap/swap-dropdown-portal";

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
  variant?: "default" | "pill";
  placeholder?: string;
};

function TokenAvatar({ token, size = "md" }: { token: SwapToken; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-10 w-10" : "h-8 w-8";
  const text = size === "sm" ? "text-xs" : "text-xs";

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
        "flex shrink-0 items-center justify-center rounded-full bg-primary/15 font-bold text-primary",
        dim,
        text
      )}
    >
      {token.symbol.slice(0, 2).toUpperCase()}
    </div>
  );
}

function formatBalance(value: bigint | undefined): string {
  if (value === undefined) return "0.0000";
  const n = Number(formatUnits(value, 18));
  if (!Number.isFinite(n)) return "0.0000";
  return n.toFixed(4);
}

function TokenRow({
  token,
  onPick,
  active,
  balance,
}: {
  token: SwapToken;
  onPick: () => void;
  active?: boolean;
  balance: string;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/30 p-3 text-left transition-colors hover:bg-muted/60",
        active && "border-primary/50 bg-primary/10"
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <TokenAvatar token={token} size="sm" />
        <div className="min-w-0">
          <p className="truncate font-semibold">{token.symbol}</p>
          <p className="truncate text-xs text-muted-foreground">{token.name}</p>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-semibold tabular-nums">{balance}</p>
        <p className="text-xs text-muted-foreground">Balance</p>
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
  const { address } = useAccount();
  const client = usePublicClient();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [allTokens, setAllTokens] = useState<SwapToken[]>([]);
  const [searchResults, setSearchResults] = useState<SwapToken[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [selected, setSelected] = useState<SwapToken | null>(null);
  const [balances, setBalances] = useState<Record<string, bigint>>({});

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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
    if (!open || !address || !client || displayedTokens.length === 0) {
      setBalances({});
      return;
    }

    let cancelled = false;
    const slice = displayedTokens.slice(0, 40);

    Promise.all(
      slice.map(async (t) => {
        try {
          const bal = await client.readContract({
            address: t.contractAddress as Address,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [address],
          });
          return [t.contractAddress.toLowerCase(), bal] as const;
        } catch {
          return [t.contractAddress.toLowerCase(), 0n] as const;
        }
      })
    ).then((rows) => {
      if (!cancelled) setBalances(Object.fromEntries(rows));
    });

    return () => {
      cancelled = true;
    };
  }, [open, address, client, displayedTokens]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => searchRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  function pickToken(token: SwapToken) {
    onChange(token.contractAddress);
    setSelected(token);
    close();
  }

  function applyManualAddress() {
    const trimmed = query.trim();
    if (!isValidTokenAddress(trimmed)) return;
    onChange(trimmed);
    setSelected(null);
    close();
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
    <div className={cn("relative", variant === "default" && "space-y-2")}>
      {label && variant === "default" && (
        <p className="text-sm font-medium leading-none">{label}</p>
      )}

      <button
        ref={triggerRef}
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

      <SwapDropdownPortal
        open={open}
        onClose={close}
        anchorRef={triggerRef}
        panelRef={panelRef}
      >
        <div className="border-b border-border/60 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, symbol, or address…"
              className="w-full rounded-lg border border-border bg-muted/30 py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div className="space-y-2 overflow-y-auto p-3">
          {listLoading && !query.trim() ? (
            <div className="flex items-center gap-2 px-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading tokens…
            </div>
          ) : loading ? (
            <div className="flex items-center gap-2 px-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </div>
          ) : displayedTokens.length === 0 && !showManualHint ? (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">
              No matching token found.
            </p>
          ) : (
            <>
              {showManualHint && (
                <button
                  type="button"
                  onClick={applyManualAddress}
                  className="flex w-full flex-col items-start rounded-xl border border-border/50 bg-muted/30 p-3 text-left text-sm hover:bg-muted/60"
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
                  balance={formatBalance(balances[token.contractAddress.toLowerCase()])}
                  onPick={() => pickToken(token)}
                />
              ))}
            </>
          )}
        </div>
      </SwapDropdownPortal>

      {value && validAddress && !selected && (
        <p className="text-xs text-muted-foreground">Resolving token…</p>
      )}
      {value && !validAddress && variant === "default" && (
        <p className="text-xs text-red-600">Invalid token address</p>
      )}
    </div>
  );
}
