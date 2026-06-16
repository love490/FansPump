import type { Address } from "viem";
import { getActiveChainId, opnChainConfig, OPN_TESTNET_TOKENS } from "@/lib/chain-config/opn";

export type RegistryTokenCategory =
  | "native"
  | "wrapped"
  | "stablecoin"
  | "utility"
  | "project";

export type RegistryToken = {
  id: string;
  name: string;
  symbol: string;
  contractAddress: string;
  decimals: number;
  logoUrl?: string | null;
  category: RegistryTokenCategory;
  verified: boolean;
  isNative: boolean;
  chainId: number;
};

const { contracts, nativeCurrency } = opnChainConfig;

/** Built-in ecosystem tokens — always available without DB indexing. */
export const BUILTIN_REGISTRY: RegistryToken[] = [
  {
    id: "native-opn",
    name: "OPN",
    symbol: "OPN",
    contractAddress: "",
    decimals: nativeCurrency.decimals,
    category: "native",
    verified: true,
    isNative: true,
    chainId: getActiveChainId(),
  },
  {
    id: contracts.wopnExplicit.toLowerCase(),
    name: "Wrapped OPN",
    symbol: "WOPN",
    contractAddress: contracts.wopnExplicit.toLowerCase(),
    decimals: 18,
    category: "wrapped",
    verified: true,
    isNative: false,
    chainId: getActiveChainId(),
  },
  {
    id: contracts.opnt.toLowerCase(),
    name: "OPN Test Token",
    symbol: "OPNT",
    contractAddress: contracts.opnt.toLowerCase(),
    decimals: 18,
    category: "utility",
    verified: true,
    isNative: false,
    chainId: getActiveChainId(),
  },
  {
    id: contracts.usdt.toLowerCase(),
    name: "Tether USD",
    symbol: "USDT",
    contractAddress: contracts.usdt.toLowerCase(),
    decimals: opnChainConfig.tokenDecimals.usdt,
    category: "stablecoin",
    verified: true,
    isNative: false,
    chainId: getActiveChainId(),
  },
];

export function getPopularRegistryTokens(): RegistryToken[] {
  return BUILTIN_REGISTRY;
}

export function getRegistryTokenByAddress(address: string): RegistryToken | undefined {
  const lower = address.toLowerCase();
  return BUILTIN_REGISTRY.find((t) => t.contractAddress === lower);
}

export function searchRegistryTokens(query: string): RegistryToken[] {
  const q = query.trim().toLowerCase();
  if (!q) return BUILTIN_REGISTRY;
  return BUILTIN_REGISTRY.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.symbol.toLowerCase().includes(q) ||
      (t.contractAddress && t.contractAddress.includes(q))
  );
}

/** Convert registry entry to swap picker row (project-side ERC20 only). */
export function registryToSwapToken(token: RegistryToken): {
  contractAddress: string;
  name: string;
  symbol: string;
  logoUrl?: string | null;
} | null {
  if (token.isNative || !token.contractAddress) return null;
  return {
    contractAddress: token.contractAddress,
    name: token.name,
    symbol: token.symbol,
    logoUrl: token.logoUrl,
  };
}

/** Pay-token shape used by swap pay selector. */
export type RegistryPayToken = {
  id: string;
  symbol: string;
  address: Address | null;
  isNative: boolean;
  decimals: number;
};

export function registryToPayToken(token: RegistryToken): RegistryPayToken {
  return {
    id: token.isNative ? "native" : token.contractAddress.toLowerCase(),
    symbol: token.symbol,
    address: token.isNative ? null : (token.contractAddress as Address),
    isNative: token.isNative,
    decimals: token.decimals,
  };
}

export function getRegistryPayTokens(): RegistryPayToken[] {
  return BUILTIN_REGISTRY.map(registryToPayToken);
}

export function mergeSwapTokenLists(
  primary: { contractAddress: string; name: string; symbol: string; logoUrl?: string | null }[],
  extra: { contractAddress: string; name: string; symbol: string; logoUrl?: string | null }[]
) {
  const seen = new Set<string>();
  const out: typeof primary = [];
  for (const t of [...primary, ...extra]) {
    const key = t.contractAddress.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

/** Re-export testnet defaults for docs / deployment scripts. */
export { OPN_TESTNET_TOKENS };
