"use client";

import { useEffect } from "react";
import { useAccount, useChainId, useSwitchChain, useWalletClient } from "wagmi";
import { opnChain, opnChainConfig } from "@/lib/chain-config/opn";

function opnAddChainParams() {
  return {
    chainId: `0x${opnChain.id.toString(16)}`,
    chainName: opnChain.name,
    nativeCurrency: opnChain.nativeCurrency,
    rpcUrls: [...opnChainConfig.rpcUrls],
    blockExplorerUrls: [opnChainConfig.explorerUrl.replace(/\/$/, "")],
  };
}

/** Switch connected wallets to OPN Chain; add the network first if the wallet does not have it. */
export function useEnsureOpnNetwork() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { data: walletClient } = useWalletClient();

  useEffect(() => {
    if (!isConnected || chainId === opnChain.id) return;

    let cancelled = false;

    void (async () => {
      try {
        if (switchChainAsync) {
          await switchChainAsync({ chainId: opnChain.id });
        }
        return;
      } catch {
        /* Chain may not exist in wallet yet — add it below. */
      }

      if (cancelled || !walletClient) return;

      try {
        await walletClient.request({
          method: "wallet_addEthereumChain",
          params: [opnAddChainParams()],
        });
      } catch {
        /* User rejected or wallet already has the chain under another id. */
      }

      if (cancelled || !switchChainAsync) return;

      try {
        await switchChainAsync({ chainId: opnChain.id });
      } catch {
        /* User rejected network switch. */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isConnected, chainId, switchChainAsync, walletClient]);
}
