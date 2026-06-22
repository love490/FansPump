import type { LiquidityPairId } from "@/lib/liquidity/pair-tokens";

export const LIQUIDITY_PATH = "/liquidity";
export const TOOLS_LOCK_PATH = "/tools/lock";
/** @deprecated Use TOOLS_LOCK_PATH */
export const TOOLS_LOCK_BURN_PATH = TOOLS_LOCK_PATH;
export const TOOLS_BURN_PATH = "/tools/burn";

/** Main liquidity page — add (default) or remove tab, optional pre-selected token. */
export function liquidityUrl(opts?: {
  token?: string;
  tab?: "add" | "remove";
  pair?: LiquidityPairId | string;
}): string {
  const params = new URLSearchParams();
  if (opts?.tab === "remove") params.set("tab", "remove");
  if (opts?.token) params.set("token", opts.token);
  if (opts?.pair) params.set("pair", String(opts.pair));
  const query = params.toString();
  return query ? `${LIQUIDITY_PATH}?${query}` : LIQUIDITY_PATH;
}

/** Per-pair remove flow (legacy manage route — redirects to main liquidity remove tab). */
export function liquidityRemovePairUrl(token: string, pairId: LiquidityPairId | string): string {
  return liquidityUrl({ token, tab: "remove", pair: pairId });
}

export function tokenLiquidityViewUrl(token: string): string {
  return `/token/${token}/liquidity`;
}
