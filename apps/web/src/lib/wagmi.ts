import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { defineChain } from "viem";

/** OPNChain Testnet — https://testnet-rpc2.iopn.tech/ */
export const OPN_CHAIN_ID = 984;
export const OPN_RPC_URL = "https://testnet-rpc2.iopn.tech/";
export const OPN_EXPLORER_URL = "https://testnet.iopn.tech/";

const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL ?? OPN_RPC_URL;
const explorerUrl = process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL ?? OPN_EXPLORER_URL;

export const opnChain = defineChain({
  id: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? OPN_CHAIN_ID),
  name: "OPNChain Testnet",
  nativeCurrency: { name: "OPN", symbol: "OPN", decimals: 18 },
  rpcUrls: {
    default: { http: [rpcUrl] },
  },
  blockExplorers: {
    default: { name: "OPNChain Testnet Explorer", url: explorerUrl },
  },
});

/** @deprecated Use `opnChain` */
export const iopnChain = opnChain;

export const wagmiConfig = getDefaultConfig({
  appName: "FansPump",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "demo",
  chains: [opnChain],
  transports: {
    [opnChain.id]: http(rpcUrl),
  },
  ssr: true,
});

export { getFactoryAddress, isFactoryConfigured, getFactoryConfigError } from "./factory-config";

/** Deployed IOPnTokenFactory on OPNChain. Must be set via NEXT_PUBLIC_FACTORY_ADDRESS. */
export const FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_FACTORY_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const LIQUIDITY_ROUTER_ADDRESS = (process.env.NEXT_PUBLIC_LIQUIDITY_ROUTER_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const DEX_ROUTER_ADDRESS = (process.env.NEXT_PUBLIC_DEX_ROUTER_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const OPN_EXPLORER_BASE = explorerUrl;
