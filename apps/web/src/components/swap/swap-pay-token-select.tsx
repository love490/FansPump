"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { usePublicClient } from "wagmi";
import type { Address } from "viem";
import { cn } from "@/lib/utils";
import {
  OPN_PAY_TOKEN,
  getBuiltinPayTokens,
  payTokenFromListedToken,
  type PayToken,
} from "@/lib/swap/payment-tokens";
import { searchRegistryTokens, registryToPayToken } from "@/lib/token-registry";
import { erc20Abi } from "@/lib/swap/abis";
import { isValidTokenAddress } from "@/lib/swap/routerAdapter";

type ListedToken = {
  contractAddress: string;
  name: string;
  symbol: string;
};

type SwapPayTokenSelectProps = {
  value: PayToken;
  onChange: (token: PayToken) => void;
  excludeAddress?: string;
};

export function SwapPayTokenSelect({ value, onChange, excludeAddress }: SwapPayTokenSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [listed, setListed] = useState<ListedToken[]>([]);
  const [resolvedAddressOption, setResolvedAddressOption] = useState<PayToken | null>(null);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const client = usePublicClient();

  useEffect(() => {
    fetch("/api/tokens?section=new&limit=100")
      .then((r) => r.json())
      .then((d) => setListed(d.tokens ?? []))
      .catch(() => setListed([]));
  }, []);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (!trimmed || !isValidTokenAddress(trimmed) || !client) {
      setResolvedAddressOption(null);
      setResolvingAddress(false);
      return;
    }

    const addr = trimmed.toLowerCase() as Address;
    if (excludeAddress && addr === excludeAddress.toLowerCase()) {
      setResolvedAddressOption(null);
      setResolvingAddress(false);
      return;
    }

    let cancelled = false;
    setResolvingAddress(true);

    async function resolve() {
      const c = client;
      if (!c) {
        setResolvedAddressOption(null);
        setResolvingAddress(false);
        return;
      }

      // 1) Try the platform registry (DB)
      try {
        const r = await fetch(`/api/tokens/${addr}`);
        if (r.ok) {
          const d = await r.json();
          if (!cancelled && d?.token?.contractAddress) {
            setResolvedAddressOption({
              id: addr,
              symbol: d.token.symbol,
              address: addr,
              isNative: false,
              decimals: d.token.decimals ?? 18,
            });
            setResolvingAddress(false);
            return;
          }
        }
      } catch {
        // ignore and fall through
      }

      // 2) Fallback: read metadata from chain so any ERC20 works
      try {
        const [symbol, decimals] = await Promise.all([
          c.readContract({ address: addr, abi: erc20Abi, functionName: "symbol" }),
          c.readContract({ address: addr, abi: erc20Abi, functionName: "decimals" }),
        ]);

        if (cancelled) return;
        setResolvedAddressOption({
          id: addr,
          symbol: String(symbol),
          address: addr,
          isNative: false,
          decimals: Number(decimals),
        });
      } catch {
        if (!cancelled) setResolvedAddressOption(null);
      } finally {
        if (!cancelled) setResolvingAddress(false);
      }
    }

    resolve();

    return () => {
      cancelled = true;
    };
  }, [query, open, client, excludeAddress]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const exclude = excludeAddress?.toLowerCase();

  const options = useMemo(() => {
    const builtins = getBuiltinPayTokens();
    const builtinIds = new Set(builtins.map((t) => t.id));
    const fromList = listed
      .filter((t) => t.contractAddress.toLowerCase() !== exclude)
      .filter((t) => !builtinIds.has(t.contractAddress.toLowerCase()))
      .map((t) => payTokenFromListedToken(t));

    return [...builtins, ...fromList];
  }, [listed, exclude]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    const registryPay = searchRegistryTokens(q).map(registryToPayToken);
    const fromOptions = options.filter(
      (t) =>
        t.symbol.toLowerCase().includes(q) ||
        t.id.includes(q) ||
        (t.address?.toLowerCase().includes(q) ?? false)
    );
    const seen = new Set<string>();
    return [...registryPay, ...fromOptions].filter((t) => {
      const key = t.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [options, query]);

  const addressQuery = query.trim();
  const isAddressQuery = isValidTokenAddress(addressQuery);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 min-w-[7rem] items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 text-sm font-semibold hover:bg-muted"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span>{value.symbol}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-64 overflow-hidden rounded-lg border bg-popover shadow-lg">
          <div className="border-b p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search token…"
                className="w-full rounded-md border bg-background py-2 pl-8 pr-2 text-sm outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <ul className="max-h-56 overflow-y-auto py-1" role="listbox">
            {!query.trim() && (
              <li className="px-3 py-1.5 text-xs font-medium text-muted-foreground">Popular · OPN ecosystem</li>
            )}
            {isAddressQuery && (
              <>
                {resolvingAddress && (
                  <li className="px-3 py-2 text-sm text-muted-foreground">Searching…</li>
                )}
                {!resolvingAddress && resolvedAddressOption && (
                  <li key={`resolved-${resolvedAddressOption.id}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={value.id === resolvedAddressOption.id}
                      onClick={() => {
                        onChange(resolvedAddressOption);
                        setOpen(false);
                        setQuery("");
                      }}
                      className={cn(
                        "flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted",
                        value.id === resolvedAddressOption.id && "bg-primary/10 text-primary"
                      )}
                    >
                      <span className="font-medium">{resolvedAddressOption.symbol}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {resolvedAddressOption.address?.slice(0, 6)}…{resolvedAddressOption.address?.slice(-4)}
                      </span>
                      <span className="text-xs text-muted-foreground">ERC20 token</span>
                    </button>
                  </li>
                )}
              </>
            )}

            {filtered.length === 0 && (!isAddressQuery || (!resolvedAddressOption && !resolvingAddress)) ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">No matching token found.</li>
            ) : (
              filtered.map((token) => (
                <li key={token.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={value.id === token.id}
                    onClick={() => {
                      onChange(token);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={cn(
                      "flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted",
                      value.id === token.id && "bg-primary/10 text-primary"
                    )}
                  >
                    <span className="font-medium">{token.symbol}</span>
                    {token.address && (
                      <span className="font-mono text-xs text-muted-foreground">
                        {token.address.slice(0, 6)}…{token.address.slice(-4)}
                      </span>
                    )}
                    {token.isNative && (
                      <span className="text-xs text-muted-foreground">Native OPN</span>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export { OPN_PAY_TOKEN };
