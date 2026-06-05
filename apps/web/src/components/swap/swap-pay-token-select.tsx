"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { ChevronDown, Loader2, Search } from "lucide-react";
import { useAccount, useBalance, usePublicClient } from "wagmi";
import { formatUnits, type Address } from "viem";
import { cn } from "@/lib/utils";
import {
  OPN_PAY_TOKEN,
  getBuiltinPayTokens,
  payTokenFromListedToken,
  type PayToken,
} from "@/lib/swap/payment-tokens";
import {
  getPopularRegistryTokens,
  searchRegistryTokens,
  registryToPayToken,
} from "@/lib/token-registry";
import { erc20Abi } from "@/lib/swap/abis";
import { isValidTokenAddress } from "@/lib/swap/routerAdapter";
import { SwapDropdownPortal } from "@/components/swap/swap-dropdown-portal";

type ListedToken = {
  contractAddress: string;
  name: string;
  symbol: string;
};

type SwapPayTokenSelectProps = {
  value: PayToken;
  onChange: (token: PayToken) => void;
  excludeAddress?: string;
  variant?: "default" | "pill";
  rowAnchorRef?: RefObject<HTMLElement | null>;
};

function PayTokenAvatar({ symbol }: { symbol: string }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
      {symbol.slice(0, 2).toUpperCase()}
    </div>
  );
}

function tokenDisplayName(symbol: string): string {
  const hit = getPopularRegistryTokens().find(
    (t) => t.symbol.toLowerCase() === symbol.toLowerCase()
  );
  return hit?.name ?? symbol;
}

function formatBalance(value: bigint | undefined, decimals: number): string {
  if (value === undefined) return "0.0000";
  const n = Number(formatUnits(value, decimals));
  if (!Number.isFinite(n)) return "0.0000";
  return n.toFixed(4);
}

function PayTokenRow({
  token,
  active,
  balance,
  onPick,
}: {
  token: PayToken;
  active: boolean;
  balance: string;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onPick}
      className={cn(
        "flex w-full items-center justify-between gap-3 overflow-hidden rounded-xl border border-border/50 bg-muted/30 p-3 text-left transition-colors hover:bg-muted/60",
        active && "border-primary/50 bg-primary/10"
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
        <PayTokenAvatar symbol={token.symbol} />
        <div className="min-w-0">
          <p className="truncate font-semibold">{token.symbol}</p>
          <p className="truncate text-xs text-muted-foreground">{tokenDisplayName(token.symbol)}</p>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-semibold tabular-nums">{balance}</p>
        <p className="text-xs text-muted-foreground">Balance</p>
      </div>
    </button>
  );
}

export function SwapPayTokenSelect({
  value,
  onChange,
  excludeAddress,
  variant = "default",
  rowAnchorRef,
}: SwapPayTokenSelectProps) {
  const { address } = useAccount();
  const client = usePublicClient();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [listed, setListed] = useState<ListedToken[]>([]);
  const [resolvedAddressOption, setResolvedAddressOption] = useState<PayToken | null>(null);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [erc20Balances, setErc20Balances] = useState<Record<string, bigint>>({});

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: nativeBalance } = useBalance({ address });

  useEffect(() => {
    if (!open) return;
    fetch("/api/tokens?section=new&limit=100")
      .then((r) => r.json())
      .then((d) => setListed(d.tokens ?? []))
      .catch(() => setListed([]));
  }, [open]);

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
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, [options, query]);

  useEffect(() => {
    if (!open || !address || !client) {
      setErc20Balances({});
      return;
    }

    const erc20s = filtered.filter((t) => !t.isNative && t.address);
    if (erc20s.length === 0) return;

    let cancelled = false;
    Promise.all(
      erc20s.map(async (t) => {
        const bal = await client.readContract({
          address: t.address!,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address],
        });
        return [t.id, bal] as const;
      })
    ).then((rows) => {
      if (cancelled) return;
      setErc20Balances(Object.fromEntries(rows));
    });

    return () => {
      cancelled = true;
    };
  }, [open, address, client, filtered]);

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
        // fall through
      }

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
    if (!open) return;
    const t = setTimeout(() => searchRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  function balanceFor(token: PayToken): string {
    if (!address) return "0.0000";
    if (token.isNative) return formatBalance(nativeBalance?.value, 18);
    return formatBalance(erc20Balances[token.id], token.decimals);
  }

  const addressQuery = query.trim();
  const isAddressQuery = isValidTokenAddress(addressQuery);

  const triggerClass =
    variant === "pill"
      ? "flex h-10 shrink-0 items-center gap-2 rounded-full border border-border bg-muted/40 px-3 text-sm font-semibold hover:bg-muted"
      : "flex h-10 min-w-[7rem] items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 text-sm font-semibold hover:bg-muted";

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={triggerClass}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <PayTokenAvatar symbol={value.symbol} />
        <span>{value.symbol}</span>
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
        anchorRef={rowAnchorRef ?? triggerRef}
        panelRef={panelRef}
        anchorMode={rowAnchorRef ? "row" : "pill"}
      >
        <div className="border-b border-border/60 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search token…"
              className="w-full rounded-lg border border-border bg-muted/30 py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <ul className="space-y-2 overflow-y-auto p-3" role="listbox">
          {isAddressQuery && resolvingAddress && (
            <li className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </li>
          )}
          {isAddressQuery && !resolvingAddress && resolvedAddressOption && (
            <li>
              <PayTokenRow
                token={resolvedAddressOption}
                active={value.id === resolvedAddressOption.id}
                balance={balanceFor(resolvedAddressOption)}
                onPick={() => {
                  onChange(resolvedAddressOption);
                  close();
                }}
              />
            </li>
          )}

          {filtered.length === 0 &&
          (!isAddressQuery || (!resolvedAddressOption && !resolvingAddress)) ? (
            <li className="px-2 py-4 text-center text-sm text-muted-foreground">
              No matching token found.
            </li>
          ) : (
            filtered.map((token) => (
              <li key={token.id}>
                <PayTokenRow
                  token={token}
                  active={value.id === token.id}
                  balance={balanceFor(token)}
                  onPick={() => {
                    onChange(token);
                    close();
                  }}
                />
              </li>
            ))
          )}
        </ul>
      </SwapDropdownPortal>
    </div>
  );
}

export { OPN_PAY_TOKEN };
