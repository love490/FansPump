import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { fallback, http } from "wagmi";
import { defineChain } from "viem";

import {
  getWopnAddress,
  getOpnRpcUrls,
  opnChainConfig,
  OPN_CHAIN_ID,
  OPN_EXPLORER_URL,
  OPN_RPC_URL,
  OPN_RPC_URLS,
} from "./chain-config/opn";

/** OPNChain Testnet — RPC via testnet-rpc2.iopn.tech */
export { OPN_CHAIN_ID, OPN_RPC_URL, OPN_RPC_URLS, OPN_EXPLORER_URL };

const rpcUrls = getOpnRpcUrls();
const explorerUrl = opnChainConfig.explorerUrl;

export const opnChain = defineChain({
  id: opnChainConfig.id,
  name: "OPNChain Testnet",
  nativeCurrency: { name: "OPN", symbol: "OPN", decimals: 18 },
  rpcUrls: {
    default: { http: rpcUrls },
  },
  blockExplorers: {
    default: { name: "OPNChain Testnet Explorer", url: explorerUrl },
  },
});

/** @deprecated Use `opnChain` */
export const iopnChain = opnChain;

const opnTransport = fallback(
  rpcUrls.map((url) =>
    http(url, {
      retryCount: 2,
      timeout: 12_000,
    })
  )
);

export const wagmiConfig = getDefaultConfig({
  appName: "FansPump",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "demo",
  chains: [opnChain],
  transports: {
    [opnChain.id]: opnTransport,
  },
  ssr: true,
});

export { getFactoryAddress, isFactoryConfigured, getFactoryConfigError } from "./factory-config";

/** Deployed IOPnTokenFactory on OPNChain — env override or testnet default in chain config. */
export const FACTORY_ADDRESS = opnChainConfig.contracts.factory;

export const LIQUIDITY_ROUTER_ADDRESS = opnChainConfig.contracts.liquidityRouter;

export const DEX_ROUTER_ADDRESS = opnChainConfig.contracts.dexRouter;

/** Wrapped OPN (WOPN) — DEX native pair token. */
export const WOPN_ADDRESS = getWopnAddress();

export const OPN_EXPLORER_BASE = explorerUrl;
