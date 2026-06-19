import { formatUnits } from "viem";
import { TOKEN_FEATURES, hasFeature } from "@iopn/shared";
import { getPublicClient } from "@/lib/rpc-client";
import prisma from "../prisma";
import { calculateTrustScore } from "../trust/scoring-engine";
import { buildTokenRiskFlags, scoreToRiskLevel } from "./risk-engine";
import * as explorer from "./blockscout";
import type {
  TokenScanResult,
  ContractSafetyResult,
  LiquiditySafetyResult,
  MarketIntegrityResult,
  RiskLevel,
} from "./types";

const ZERO = "0x0000000000000000000000000000000000000000";

const ERC20_ABI = [
  {
    name: "name",
    type: "function",
    inputs: [],
    outputs: [{ type: "string" }],
    stateMutability: "view",
  },
  {
    name: "symbol",
    type: "function",
    inputs: [],
    outputs: [{ type: "string" }],
    stateMutability: "view",
  },
  {
    name: "decimals",
    type: "function",
    inputs: [],
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
  },
  {
    name: "totalSupply",
    type: "function",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "owner",
    type: "function",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
] as const;

export async function scanToken(address: string): Promise<TokenScanResult> {
  const normalized = address.toLowerCase();
  const addr = normalized as `0x${string}`;
  const client = getPublicClient();

  const [name, symbol, decimals, totalSupply] = await Promise.allSettled([
    client.readContract({ address: addr, abi: ERC20_ABI, functionName: "name" }),
    client.readContract({ address: addr, abi: ERC20_ABI, functionName: "symbol" }),
    client.readContract({ address: addr, abi: ERC20_ABI, functionName: "decimals" }),
    client.readContract({ address: addr, abi: ERC20_ABI, functionName: "totalSupply" }),
  ]);

  const contractInfo = await explorer.getContractInfo(normalized);
  const deployer =
    (contractInfo?.creator_address_hash as string | undefined) ??
    (contractInfo?.deployed_by as string | undefined) ??
    "";

  const fansPumpToken = await prisma.tokenProject.findUnique({
    where: { contractAddress: normalized },
    select: {
      id: true,
      contractAddress: true,
      creatorAddress: true,
      featureFlags: true,
      ownershipRenounced: true,
      verificationStatus: true,
      isScam: true,
      poolStrength: true,
      holderCount: true,
      volume24h: true,
      txCount24h: true,
      trustScore: true,
      liquidityLocks: { select: { unlockAt: true } },
      lpBurns: { select: { id: true }, take: 1 },
    },
  });

  let contractSafety: ContractSafetyResult;
  let liquiditySafety: LiquiditySafetyResult;
  let marketIntegrity: MarketIntegrityResult;
  let trustScore: number;

  if (fansPumpToken) {
    const trust = await calculateTrustScore({
      tokenAddress: fansPumpToken.contractAddress,
      tokenId: fansPumpToken.id,
      creatorAddress: fansPumpToken.creatorAddress,
      featureFlags: fansPumpToken.featureFlags,
      ownershipRenounced: fansPumpToken.ownershipRenounced,
      verificationStatus: fansPumpToken.verificationStatus,
      isScam: fansPumpToken.isScam,
      poolStrength: fansPumpToken.poolStrength,
      holderCount: fansPumpToken.holderCount,
      volume24h: fansPumpToken.volume24h,
      txCount24h: fansPumpToken.txCount24h,
      hasLpBurn: (fansPumpToken.lpBurns?.length ?? 0) > 0,
    });

    trustScore = trust.score;
    contractSafety = mapContractSignals(trust.signals.contract);
    liquiditySafety = mapLiquiditySignals(trust.signals.liquidity);
    marketIntegrity = mapMarketSignals(trust.signals.market, fansPumpToken.holderCount);

    await prisma.tokenProject
      .update({
        where: { id: fansPumpToken.id },
        data: { trustScore: trust.score, trustScoreUpdatedAt: new Date() },
      })
      .catch(() => {});
  } else {
    [contractSafety, liquiditySafety, marketIntegrity] = await Promise.all([
      analyzeContractSafety(addr, contractInfo, fansPumpToken),
      analyzeLiquiditySafety(normalized, null),
      analyzeMarketIntegrity(normalized),
    ]);

    trustScore = Math.round(
      contractSafety.score * 0.4 + liquiditySafety.score * 0.35 + marketIntegrity.score * 0.25
    );
  }

  const riskLevel = scoreToRiskLevel(trustScore);
  const riskFlags = buildTokenRiskFlags({ contractSafety, liquiditySafety, marketIntegrity });
  const deployerRisk = await getDeployerRisk(deployer);

  const tokenDecimals =
    decimals.status === "fulfilled" ? Number(decimals.value) : 18;

  return {
    address: normalized,
    name: name.status === "fulfilled" ? String(name.value) : "Unknown",
    symbol: symbol.status === "fulfilled" ? String(symbol.value) : "???",
    decimals: tokenDecimals,
    totalSupply:
      totalSupply.status === "fulfilled"
        ? formatUnits(totalSupply.value as bigint, tokenDecimals)
        : "0",
    isFansPumpToken: !!fansPumpToken,
    trustScore,
    riskLevel,
    contractSafety,
    liquiditySafety,
    marketIntegrity,
    deployer,
    deployerRisk,
    riskFlags,
    scannedAt: new Date().toISOString(),
  };
}

function mapContractSignals(signals: {
  sourceVerified: boolean;
  ownershipRenounced: boolean;
  mintAuthorityRevoked: boolean;
  honeypotRisk: boolean;
  score: number;
}): ContractSafetyResult {
  return {
    score: signals.score,
    sourceVerified: signals.sourceVerified,
    ownershipRenounced: signals.ownershipRenounced,
    mintAuthorityExists: !signals.mintAuthorityRevoked,
    honeypotRisk: signals.honeypotRisk,
  };
}

function mapLiquiditySignals(signals: {
  liquidityLocked: boolean;
  lockDurationDays: number;
  liquidityDepthUSD: number;
  removalEventsLast30d: number;
  lpConcentration: number;
  score: number;
}): LiquiditySafetyResult {
  return {
    score: signals.score,
    hasLiquidity: signals.liquidityDepthUSD > 0,
    liquidityUSD: signals.liquidityDepthUSD,
    locked: signals.liquidityLocked,
    lockDurationDays: signals.lockDurationDays,
    lpConcentration: signals.lpConcentration,
    removalEvents: signals.removalEventsLast30d,
  };
}

function mapMarketSignals(
  signals: { top10HolderPercent: number; washTradingScore: number; score: number },
  holderCount: number
): MarketIntegrityResult {
  return {
    score: signals.score,
    holders: holderCount,
    top10HolderPercent: signals.top10HolderPercent,
    sniperWallets: 0,
    washTradingDetected: signals.washTradingScore > 50,
  };
}

async function analyzeContractSafety(
  address: `0x${string}`,
  contractInfo: Record<string, unknown> | null,
  fansPumpToken: { featureFlags: bigint; ownershipRenounced: boolean; isScam: boolean } | null
): Promise<ContractSafetyResult> {
  const client = getPublicClient();
  const sourceVerified = Boolean(contractInfo?.is_verified);

  let ownershipRenounced = fansPumpToken?.ownershipRenounced ?? false;
  if (!fansPumpToken) {
    try {
      const owner = await client.readContract({
        address,
        abi: ERC20_ABI,
        functionName: "owner",
      });
      ownershipRenounced = (owner as string).toLowerCase() === ZERO;
    } catch {
      ownershipRenounced = true;
    }
  }

  let mintAuthorityExists = false;
  if (fansPumpToken) {
    mintAuthorityExists = hasFeature(Number(fansPumpToken.featureFlags), TOKEN_FEATURES.MINTABLE);
  } else {
    try {
      const bytecode = await client.getBytecode({ address });
      mintAuthorityExists = bytecode?.includes("40c10f19") ?? false;
    } catch {
      mintAuthorityExists = false;
    }
  }

  let score = 15;
  if (sourceVerified) score += 35;
  if (ownershipRenounced) score += 30;
  if (!mintAuthorityExists) score += 20;

  return {
    score: Math.min(score, 100),
    sourceVerified,
    ownershipRenounced,
    mintAuthorityExists,
    honeypotRisk: fansPumpToken?.isScam ?? false,
  };
}

async function analyzeLiquiditySafety(
  address: string,
  fansPumpToken: { poolStrength: number; liquidityLocks: { unlockAt: Date }[] } | null
): Promise<LiquiditySafetyResult> {
  if (!fansPumpToken || fansPumpToken.poolStrength <= 0) {
    const pool = await prisma.liquidityPool
      .findFirst({
        where: {
          OR: [{ token0: address }, { token1: address }],
        },
      })
      .catch(() => null);

    if (!pool) {
      return {
        score: 20,
        hasLiquidity: false,
        liquidityUSD: 0,
        locked: false,
        lockDurationDays: 0,
        lpConcentration: 100,
        removalEvents: 0,
      };
    }

    const liquidityUSD = Number.parseFloat(pool.totalLiquidity) || 0;
    return {
      score: liquidityUSD >= 1000 ? 35 : 25,
      hasLiquidity: liquidityUSD > 0,
      liquidityUSD,
      locked: false,
      lockDurationDays: 0,
      lpConcentration: 100,
      removalEvents: 0,
    };
  }

  const now = Date.now();
  const locks = fansPumpToken.liquidityLocks ?? [];
  const liquidityLocked = locks.length > 0;
  let lockDurationDays = 0;
  if (liquidityLocked) {
    const activeLocks = locks.filter((l) => l.unlockAt.getTime() > now);
    if (activeLocks.length > 0) {
      const maxUnlock = Math.max(...activeLocks.map((l) => l.unlockAt.getTime()));
      lockDurationDays = Math.max(0, Math.round((maxUnlock - now) / (1000 * 60 * 60 * 24)));
    }
  }

  const liquidityUSD = fansPumpToken.poolStrength;
  let score = 0;
  if (liquidityLocked) {
    score += 40;
    if (lockDurationDays >= 365) score += 10;
    else if (lockDurationDays >= 180) score += 5;
  }
  if (liquidityUSD >= 50_000) score += 20;
  else if (liquidityUSD >= 10_000) score += 12;
  else if (liquidityUSD >= 1_000) score += 5;

  return {
    score: Math.min(score, 100),
    hasLiquidity: true,
    liquidityUSD,
    locked: liquidityLocked,
    lockDurationDays,
    lpConcentration: 100,
    removalEvents: 0,
  };
}

async function analyzeMarketIntegrity(address: string): Promise<MarketIntegrityResult> {
  const data = await explorer.getTokenHolders(address);
  const list = (data?.items as Array<{ percentage?: string }> | undefined) ?? [];
  const holders =
    typeof data?.items_count === "number"
      ? data.items_count
      : list.length;

  let top10HolderPercent = 100;
  if (list.length > 0) {
    top10HolderPercent = Math.round(
      list.slice(0, 10).reduce((acc, h) => acc + Number.parseFloat(h.percentage ?? "0"), 0)
    );
  }

  let score = 100;
  if (top10HolderPercent > 80) score -= 35;
  else if (top10HolderPercent > 60) score -= 15;
  if (holders < 10) score -= 25;
  else if (holders < 50) score -= 10;

  return {
    score: Math.max(0, score),
    holders,
    top10HolderPercent,
    sniperWallets: 0,
    washTradingDetected: false,
  };
}

async function getDeployerRisk(deployer: string): Promise<RiskLevel> {
  if (!deployer) return "UNKNOWN";

  const cached = await prisma.walletScan
    .findUnique({
      where: { address: deployer.toLowerCase() },
      select: { riskLevel: true },
    })
    .catch(() => null);

  return (cached?.riskLevel as RiskLevel) ?? "UNKNOWN";
}
