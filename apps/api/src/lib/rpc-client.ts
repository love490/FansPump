import { createPublicClient, http } from "viem";
import { opnChainConfig } from "@/lib/chain-config/opn";

export function getPublicClient() {
  return createPublicClient({
    chain: {
      id: opnChainConfig.id,
      name: opnChainConfig.name,
      nativeCurrency: opnChainConfig.nativeCurrency,
      rpcUrls: { default: { http: [opnChainConfig.rpcUrl] } },
    },
    transport: http(opnChainConfig.rpcUrl),
  });
}
