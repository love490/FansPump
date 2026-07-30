import { isNativeOpnToken, NATIVE_OPN_ID } from "@/lib/tokens/token-route";

export const WALLET_TOKEN_BASE = "/dashboard/token";

/**
 * Wallet-scoped asset page for a holding.
 *
 * The wallet dashboard is a portfolio manager, so assets open their own
 * management page rather than jumping straight into the swap widget. Public
 * `/token/[address]` links are unaffected.
 */
export function walletTokenHref(
  contractAddress: string | null | undefined,
  symbol?: string
): string {
  if (!contractAddress || isNativeOpnToken(contractAddress, symbol)) {
    return `${WALLET_TOKEN_BASE}/${NATIVE_OPN_ID}`;
  }
  return `${WALLET_TOKEN_BASE}/${contractAddress.toLowerCase()}`;
}
