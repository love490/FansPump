import type { Address, WalletClient } from "viem";

export type WatchAssetToken = {
  address: string;
  symbol: string;
  decimals: number;
  logoUrl?: string | null;
};

/** MetaMask caps the token symbol it will accept in the add-token prompt. */
const MAX_SYMBOL_LENGTH = 11;

function normalizeSymbol(symbol: string): string {
  const cleaned = symbol.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return (cleaned || "TOKEN").slice(0, MAX_SYMBOL_LENGTH);
}

/**
 * Asks the connected wallet to track an ERC-20 (`wallet_watchAsset`).
 *
 * Wallets that do not implement the method throw, so callers should surface the
 * returned reason rather than assuming success.
 */
export async function addTokenToWallet(
  walletClient: WalletClient | null | undefined,
  token: WatchAssetToken
): Promise<{ ok: boolean; error?: string }> {
  if (!walletClient) {
    return { ok: false, error: "Connect a wallet first." };
  }
  if (!token.address.startsWith("0x")) {
    return { ok: false, error: "Invalid token address." };
  }

  try {
    const added = await walletClient.watchAsset({
      type: "ERC20",
      options: {
        address: token.address as Address,
        symbol: normalizeSymbol(token.symbol),
        decimals: token.decimals,
        ...(token.logoUrl ? { image: token.logoUrl } : {}),
      },
    });
    return added
      ? { ok: true }
      : { ok: false, error: "Your wallet declined the request." };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Wallet rejected the request.";
    if (/not support|unsupported|method not found/i.test(message)) {
      return { ok: false, error: "This wallet does not support adding tokens." };
    }
    return { ok: false, error: message };
  }
}
