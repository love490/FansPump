import {
  type Address,
  type PublicClient,
  formatEther,
  formatUnits,
  isAddress,
  parseEther,
  parseUnits,
} from "viem";
import { uniswapV2RouterAbi, erc20Abi } from "./abis";
import { SWAP_DEADLINE_SECONDS, type RouterType, type SwapMode } from "./constants";
import { type PayToken, isPayTokenConfigured } from "./payment-tokens";

const PRIMARY_ROUTER = (process.env.NEXT_PUBLIC_DEX_ROUTER_ADDRESS ??
  process.env.NEXT_PUBLIC_PRIMARY_DEX_ROUTER ??
  "0x0000000000000000000000000000000000000000") as Address;

const UNISWAP_ROUTER = (process.env.NEXT_PUBLIC_UNISWAP_ROUTER_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as Address;

const WETH_OVERRIDE = process.env.NEXT_PUBLIC_WETH_ADDRESS as Address | undefined;

export function getRouterAddress(type: RouterType = "primary"): Address {
  if (type === "uniswap" && UNISWAP_ROUTER !== "0x0000000000000000000000000000000000000000") {
    return UNISWAP_ROUTER;
  }
  return PRIMARY_ROUTER;
}

export function isValidTokenAddress(address: string): address is Address {
  return isAddress(address) && address !== "0x0000000000000000000000000000000000000000";
}

export async function getWethAddress(client: PublicClient, routerType: RouterType = "primary"): Promise<Address> {
  if (WETH_OVERRIDE) return WETH_OVERRIDE;
  const router = getRouterAddress(routerType);
  if (router === "0x0000000000000000000000000000000000000000") {
    throw new Error("DEX router is not configured");
  }
  return client.readContract({ address: router, abi: uniswapV2RouterAbi, functionName: "WETH" });
}

async function resolvePayTokenDecimals(client: PublicClient, payToken: PayToken): Promise<number> {
  if (payToken.isNative || !payToken.address) return payToken.decimals;
  try {
    const onChain = await client.readContract({
      address: payToken.address,
      abi: erc20Abi,
      functionName: "decimals",
    });
    return Number(onChain);
  } catch {
    return payToken.decimals;
  }
}

export function buildSwapPath(
  weth: Address,
  projectToken: Address,
  mode: SwapMode,
  payToken: PayToken
): Address[] {
  if (mode === "buy") {
    if (payToken.isNative) return [weth, projectToken];
    return [payToken.address!, weth, projectToken];
  }

  if (payToken.isNative) return [projectToken, weth];
  return [projectToken, weth, payToken.address!];
}

export interface SwapQuoteParams {
  client: PublicClient;
  tokenAddress: Address;
  amountIn: string;
  mode: SwapMode;
  payToken: PayToken;
  routerType?: RouterType;
}

export interface SwapQuoteResult {
  amountIn: bigint;
  amountOut: bigint;
  path: Address[];
  routerAddress: Address;
  routerLabel: string;
  priceImpactBps: number;
  routeLabel: string;
  weth: Address;
  payToken: PayToken;
  paymentDecimals: number;
  /** ERC20 to approve before swap (payment token on buy, project token on sell) */
  approvalToken: Address | null;
  swapKind: "native-in" | "native-out" | "erc20";
}

export async function fetchSwapQuote(params: SwapQuoteParams): Promise<SwapQuoteResult> {
  const { client, tokenAddress, amountIn, mode, payToken, routerType = "primary" } = params;
  const routerAddress = getRouterAddress(routerType);

  if (routerAddress === "0x0000000000000000000000000000000000000000") {
    throw new Error("Swap router is not configured. Set NEXT_PUBLIC_DEX_ROUTER_ADDRESS.");
  }

  if (!isPayTokenConfigured(payToken)) {
    throw new Error(`${payToken.symbol} is not available on this network.`);
  }

  if (
    payToken.address &&
    tokenAddress.toLowerCase() === payToken.address.toLowerCase()
  ) {
    throw new Error("Select a different token to swap — payment and target token cannot be the same.");
  }

  if (!amountIn || Number(amountIn) <= 0) {
    throw new Error("Enter an amount greater than zero");
  }

  const paymentDecimals = await resolvePayTokenDecimals(client, payToken);
  const weth = await getWethAddress(client, routerType);
  const path = buildSwapPath(weth, tokenAddress, mode, payToken);

  const parsedIn =
    mode === "buy"
      ? payToken.isNative
        ? parseEther(amountIn)
        : parseUnits(amountIn, paymentDecimals)
      : parseUnits(amountIn, 18);

  const amounts = await client.readContract({
    address: routerAddress,
    abi: uniswapV2RouterAbi,
    functionName: "getAmountsOut",
    args: [parsedIn, path],
  });

  const amountOut = amounts[amounts.length - 1];
  if (amountOut === 0n) {
    throw new Error("Insufficient liquidity for this pair");
  }

  const priceImpactBps = await estimatePriceImpactBps(client, routerAddress, parsedIn, amountOut, path);

  const routeFrom = mode === "buy" ? payToken.symbol : "Token";
  const routeTo = mode === "buy" ? "Token" : payToken.symbol;

  let swapKind: SwapQuoteResult["swapKind"];
  if (mode === "buy" && payToken.isNative) swapKind = "native-in";
  else if (mode === "sell" && payToken.isNative) swapKind = "native-out";
  else swapKind = "erc20";

  const approvalToken =
    mode === "buy"
      ? payToken.isNative
        ? null
        : payToken.address
      : tokenAddress;

  return {
    amountIn: parsedIn,
    amountOut,
    path,
    routerAddress,
    routerLabel: routerType === "uniswap" ? "Uniswap-compatible" : "IOPn DEX Router",
    priceImpactBps,
    routeLabel: `${routeFrom} → ${routeTo}`,
    weth,
    payToken,
    paymentDecimals,
    approvalToken,
    swapKind,
  };
}

async function estimatePriceImpactBps(
  client: PublicClient,
  router: Address,
  amountIn: bigint,
  amountOut: bigint,
  path: Address[]
): Promise<number> {
  try {
    const refIn = amountIn / 100n || 1n;
    const refAmounts = await client.readContract({
      address: router,
      abi: uniswapV2RouterAbi,
      functionName: "getAmountsOut",
      args: [refIn, path],
    });
    const refOut = refAmounts[refAmounts.length - 1];
    if (refOut === 0n) return 0;
    const spotOut = (amountIn * refOut) / refIn;
    if (spotOut <= amountOut) return 0;
    return Number((((spotOut - amountOut) * 10_000n) / spotOut));
  } catch {
    return 0;
  }
}

export function applySlippage(amountOut: bigint, slippagePercent: number): bigint {
  const bps = BigInt(Math.round(slippagePercent * 100));
  return (amountOut * (10_000n - bps)) / 10_000n;
}

export interface BuildSwapTxParams {
  quote: SwapQuoteResult;
  recipient: Address;
  slippagePercent: number;
  mode: SwapMode;
}

export function buildSwapTransaction(params: BuildSwapTxParams) {
  const { quote, recipient, slippagePercent, mode } = params;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + SWAP_DEADLINE_SECONDS);
  const amountOutMin = applySlippage(quote.amountOut, slippagePercent);

  if (mode === "buy" && quote.swapKind === "native-in") {
    return {
      address: quote.routerAddress,
      abi: uniswapV2RouterAbi,
      functionName: "swapExactETHForTokens" as const,
      args: [amountOutMin, quote.path, recipient, deadline] as const,
      value: quote.amountIn,
    };
  }

  if (mode === "sell" && quote.swapKind === "native-out") {
    return {
      address: quote.routerAddress,
      abi: uniswapV2RouterAbi,
      functionName: "swapExactTokensForETH" as const,
      args: [quote.amountIn, amountOutMin, quote.path, recipient, deadline] as const,
      value: 0n,
    };
  }

  return {
    address: quote.routerAddress,
    abi: uniswapV2RouterAbi,
    functionName: "swapExactTokensForTokens" as const,
    args: [quote.amountIn, amountOutMin, quote.path, recipient, deadline] as const,
    value: 0n,
  };
}

export function formatSwapAmount(
  value: bigint,
  decimals: number
): string {
  return decimals === 18 ? formatEther(value) : formatUnits(value, decimals);
}

export async function fetchTokenSymbol(client: PublicClient, token: Address): Promise<string> {
  try {
    return await client.readContract({ address: token, abi: erc20Abi, functionName: "symbol" });
  } catch {
    return "TOKEN";
  }
}

export function getExplorerTxUrl(hash: string): string {
  const base = process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL ?? "https://testnet.iopn.tech/";
  return `${base.replace(/\/$/, "")}/tx/${hash}`;
}
