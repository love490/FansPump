import type { Address, Hash, PublicClient } from "viem";
import { formatUnits, isAddress, parseEther } from "viem";
import { erc20Abi } from "@/lib/swap/abis";
import { uniswapV2PairAbi } from "@/lib/liquidity/abis";
import { opnChainConfig, DEX_ROUTER_ADDRESS } from "@/lib/chain-config/opn";
import { resolveDexFactory } from "@/lib/liquidity/dex-factory";
import { findPairAddress, quoteCandidatesForPairId } from "@/lib/liquidity/pair-resolve";
import { readRouterWeth } from "@/lib/liquidity/router-weth";
import type { LiquidityPairId } from "@/lib/liquidity/pair-tokens";
import type { VerificationConfig } from "./verification-types";

export type OnchainVerifyResult = {
  ok: boolean;
  reason?: string;
  details?: Record<string, unknown>;
};

const ZERO = "0x0000000000000000000000000000000000000000";

function parseMinAmount(config: VerificationConfig): bigint {
  if (!config.minAmount) return 0n;
  try {
    return BigInt(config.minAmount);
  } catch {
    return 0n;
  }
}

async function verifyHoldToken(
  client: PublicClient,
  wallet: Address,
  config: VerificationConfig
): Promise<OnchainVerifyResult> {
  const min = parseMinAmount(config);
  if (min <= 0n) {
    return { ok: false, reason: "Quest misconfigured: minAmount required for HOLD_TOKEN" };
  }

  const tokenRef = (config.tokenAddress ?? "").toLowerCase();
  if (!tokenRef || tokenRef === "native") {
    const balance = await client.getBalance({ address: wallet });
    if (balance < min) {
      return {
        ok: false,
        reason: `Need at least ${formatUnits(min, 18)} OPN`,
        details: { balance: balance.toString(), required: min.toString() },
      };
    }
    return { ok: true, details: { balance: balance.toString() } };
  }

  if (!isAddress(tokenRef)) {
    return { ok: false, reason: "Invalid token address in quest config" };
  }

  const [balance, decimals] = await Promise.all([
    client.readContract({
      address: tokenRef as Address,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [wallet],
    }),
    client.readContract({
      address: tokenRef as Address,
      abi: erc20Abi,
      functionName: "decimals",
    }).catch(() => 18),
  ]);

  if (balance < min) {
    return {
      ok: false,
      reason: `Insufficient token balance (need ${formatUnits(min, Number(decimals))})`,
      details: { balance: balance.toString(), required: min.toString() },
    };
  }

  return { ok: true, details: { balance: balance.toString() } };
}

async function verifyAddLiquidity(
  client: PublicClient,
  wallet: Address,
  config: VerificationConfig,
  bountyTokenAddress?: string | null
): Promise<OnchainVerifyResult> {
  const tokenAddress = config.tokenAddress ?? bountyTokenAddress;
  if (!tokenAddress || !isAddress(tokenAddress)) {
    return { ok: false, reason: "Quest requires a project token for liquidity verification" };
  }

  const pairId = (config.pairId ?? "OPN") as LiquidityPairId;
  const minLp = config.minLpAmount ? BigInt(config.minLpAmount) : 1n;

  const factory = await resolveDexFactory(client);
  const weth = await readRouterWeth(client, DEX_ROUTER_ADDRESS);
  const usdt = opnChainConfig.contracts.usdt;
  const wopn = opnChainConfig.contracts.wopnExplicit;
  const quotes = quoteCandidatesForPairId(pairId, weth, wopn, usdt);
  const pair = await findPairAddress(client, factory, tokenAddress as Address, quotes);

  if (!pair || pair.toLowerCase() === ZERO) {
    return { ok: false, reason: "No liquidity pool found for this token pair" };
  }

  const lpBalance = await client.readContract({
    address: pair,
    abi: uniswapV2PairAbi,
    functionName: "balanceOf",
    args: [wallet],
  });

  if (lpBalance < minLp) {
    return {
      ok: false,
      reason: "Add liquidity to the required pool first",
      details: { lpBalance: lpBalance.toString(), pair: pair.toLowerCase() },
    };
  }

  return { ok: true, details: { lpBalance: lpBalance.toString(), pair: pair.toLowerCase() } };
}

async function verifySwap(
  client: PublicClient,
  wallet: Address,
  config: VerificationConfig,
  proofTxHash?: string
): Promise<OnchainVerifyResult> {
  const txHash = (proofTxHash ?? config.txHash) as Hash | undefined;
  if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return { ok: false, reason: "Submit a valid swap transaction hash as proof" };
  }

  try {
    const [tx, receipt] = await Promise.all([
      client.getTransaction({ hash: txHash }),
      client.getTransactionReceipt({ hash: txHash }),
    ]);

    if (!tx || !receipt || receipt.status !== "success") {
      return { ok: false, reason: "Transaction not found or failed" };
    }

    if (tx.from.toLowerCase() !== wallet.toLowerCase()) {
      return { ok: false, reason: "Transaction must be from your connected wallet" };
    }

    const router = DEX_ROUTER_ADDRESS.toLowerCase();
    const touchedRouter =
      tx.to?.toLowerCase() === router ||
      receipt.logs.some((log) => log.address.toLowerCase() === router);

    if (!touchedRouter) {
      return { ok: false, reason: "Transaction does not appear to be a DEX swap" };
    }

    return { ok: true, details: { txHash } };
  } catch {
    return { ok: false, reason: "Could not verify swap transaction" };
  }
}

async function verifyStake(
  client: PublicClient,
  wallet: Address,
  config: VerificationConfig
): Promise<OnchainVerifyResult> {
  const min = parseMinAmount(config) || parseEther("0.001");

  if (config.tokenAddress && isAddress(config.tokenAddress)) {
    const balance = await client.readContract({
      address: config.tokenAddress as Address,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [wallet],
    });
    if (balance >= min) {
      return { ok: true, details: { stakedOrHeld: balance.toString() } };
    }
  }

  const native = await client.getBalance({ address: wallet });
  if (native >= min) {
    return { ok: true, details: { nativeBalance: native.toString() } };
  }

  return {
    ok: false,
    reason: "Stake requirement not met — hold or stake the required amount",
    details: { required: min.toString() },
  };
}

export async function verifyOnchainRequirement(
  client: PublicClient,
  wallet: Address,
  config: VerificationConfig,
  options?: { bountyTokenAddress?: string | null; proofTxHash?: string }
): Promise<OnchainVerifyResult> {
  const type = config.requirementType;
  if (!type) {
    return { ok: false, reason: "On-chain requirement type not configured" };
  }

  switch (type) {
    case "HOLD_TOKEN":
      return verifyHoldToken(client, wallet, config);
    case "ADD_LIQUIDITY":
      return verifyAddLiquidity(client, wallet, config, options?.bountyTokenAddress);
    case "SWAP":
      return verifySwap(client, wallet, config, options?.proofTxHash);
    case "STAKE":
      return verifyStake(client, wallet, config);
    default:
      return { ok: false, reason: `Unsupported on-chain requirement: ${type}` };
  }
}
