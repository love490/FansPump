import type { Address } from "viem";
import { defineChain } from "viem";

/** OPNChain Testnet — single source of truth for chain + ecosystem tokens. */
export const OPN_CHAIN_ID = 984;

/** Official OPN testnet RPC endpoint. */
export const OPN_RPC_URLS = ["https://testnet-rpc2.iopn.tech/"] as const;

/** Primary RPC (backwards compatible). */
export const OPN_RPC_URL = OPN_RPC_URLS[0];

export const OPN_EXPLORER_URL = "https://testnet.iopn.tech/";

/** Resolve RPC list: env override or the default testnet-rpc2 endpoint. */
export function getOpnRpcUrls(): string[] {
  const env = process.env.NEXT_PUBLIC_RPC_URL?.trim();
  if (env) {
    const fromEnv = env
      .split(",")
      .map((url) => url.trim())
      .filter(Boolean);
    if (fromEnv.length > 0) return fromEnv;
  }
  return [...OPN_RPC_URLS];
}

const ZERO = "0x0000000000000000000000000000000000000000" as Address;

function envAddress(key: string, fallback: Address): Address {
  const raw = (process.env[key] ?? "").trim();
  if (raw && raw !== ZERO) return raw as Address;
  return fallback;
}

/** Official OPN Testnet token addresses (defaults when env unset). */
export const OPN_TESTNET_TOKENS = {
  WOPN: "0xBc022C9dEb5AF250A526321d16Ef52E39b4DBD84" as Address,
  OPNT: "0x2aEc1Db9197Ff284011A6A1d0752AD03F5782B0d" as Address,
  USDT: "0x3e01b4d892E0D0A219eF8BBe7e260a6bc8d9B31b" as Address,
} as const;

/** Deployed FansPump / IOPn contracts on OPN Testnet (defaults when env unset). */
export const OPN_TESTNET_CONTRACTS = {
  FACTORY: "0xe93B7E9d8B5e6b4676d78693C24794A66F8Bb9AC" as Address,
  DEX_ROUTER: "0xB489bce5c9c9364da2D1D1Bc5CE4274F63141885" as Address,
  LIQUIDITY_ROUTER: "0xB489bce5c9c9364da2D1D1Bc5CE4274F63141885" as Address,
} as const;

export const opnChainConfig = {
  id: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? OPN_CHAIN_ID),
  name: "OPNChain Testnet",
  rpcUrl: getOpnRpcUrls()[0],
  rpcUrls: getOpnRpcUrls(),
  explorerUrl: process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL ?? OPN_EXPLORER_URL,
  nativeCurrency: {
    name: "OPN",
    symbol: "OPN",
    decimals: 18,
  },
  contracts: {
    factory: envAddress("NEXT_PUBLIC_FACTORY_ADDRESS", OPN_TESTNET_CONTRACTS.FACTORY),
    dexRouter: envAddress("NEXT_PUBLIC_DEX_ROUTER_ADDRESS", OPN_TESTNET_CONTRACTS.DEX_ROUTER),
    liquidityRouter: envAddress(
      "NEXT_PUBLIC_LIQUIDITY_ROUTER_ADDRESS",
      OPN_TESTNET_CONTRACTS.LIQUIDITY_ROUTER
    ),
    liquidityLocker: envAddress("NEXT_PUBLIC_LIQUIDITY_LOCKER_ADDRESS", ZERO),
    /** Wrapped native OPN — used by DEX routers when native OPN is swapped. */
    wopn: envAddress("NEXT_PUBLIC_WETH_ADDRESS", OPN_TESTNET_TOKENS.WOPN),
    wopnExplicit: envAddress("NEXT_PUBLIC_WOPN_ADDRESS", OPN_TESTNET_TOKENS.WOPN),
    opnt: envAddress("NEXT_PUBLIC_OPNT_ADDRESS", OPN_TESTNET_TOKENS.OPNT),
    usdt: envAddress("NEXT_PUBLIC_USDT_ADDRESS", OPN_TESTNET_TOKENS.USDT),
  },
  tokenDecimals: {
    usdt: Number(process.env.NEXT_PUBLIC_USDT_DECIMALS ?? 18),
  },
} as const;

/** Viem chain definition — safe for server routes (no RainbowKit). */
export const opnChain = defineChain({
  id: opnChainConfig.id,
  name: opnChainConfig.name,
  nativeCurrency: opnChainConfig.nativeCurrency,
  rpcUrls: {
    default: { http: getOpnRpcUrls() },
  },
  blockExplorers: {
    default: { name: "OPNChain Testnet Explorer", url: opnChainConfig.explorerUrl },
  },
});

export function getActiveChainId(): number {
  return opnChainConfig.id;
}

export function getWopnAddress(): Address {
  return opnChainConfig.contracts.wopn;
}
