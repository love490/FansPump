"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, useChainId, useSwitchChain, useWalletClient } from "wagmi";
import type { WalletClient } from "viem";
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

type SwitchDeps = {
  switchChainAsync?: (args: { chainId: number }) => Promise<unknown>;
  walletClient?: WalletClient | null;
};

/** Prompt the wallet to add OPN Chain (if needed) and switch to it. */
export async function switchToOpnNetwork({ switchChainAsync, walletClient }: SwitchDeps) {
  if (switchChainAsync) {
    try {
      await switchChainAsync({ chainId: opnChain.id });
      return;
    } catch {
      /* Chain may not exist in wallet yet — add it below. */
    }
  }

  if (walletClient) {
    try {
      await walletClient.request({
        method: "wallet_addEthereumChain",
        params: [opnAddChainParams()],
      });
    } catch {
      /* User rejected or chain already registered under another id. */
    }
  }

  if (switchChainAsync) {
    await switchChainAsync({ chainId: opnChain.id });
    return;
  }

  throw new Error("Wallet is not ready to switch networks");
}

export function useSwitchToOpnNetwork(options?: { autoSwitch?: boolean }) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  const wrongNetwork = isConnected && chainId !== opnChain.id;

  const switchToOpn = useCallback(async () => {
    setSwitching(true);
    setSwitchError(null);
    try {
      await switchToOpnNetwork({ switchChainAsync, walletClient });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not switch to OPN Chain";
      setSwitchError(message);
      throw error;
    } finally {
      setSwitching(false);
    }
  }, [switchChainAsync, walletClient]);

  useEffect(() => {
    if (!options?.autoSwitch || !wrongNetwork) return;
    if (!switchChainAsync && !walletClient) return;

    void switchToOpn().catch(() => undefined);
  }, [options?.autoSwitch, wrongNetwork, switchChainAsync, walletClient, switchToOpn]);

  return {
    wrongNetwork,
    switching,
    switchError,
    switchToOpn,
    opnChain,
  };
}

/** Switch connected wallets to OPN Chain; add the network first if the wallet does not have it. */
export function useEnsureOpnNetwork() {
  useSwitchToOpnNetwork({ autoSwitch: true });
}
