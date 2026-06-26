import { formatUnits, isAddress } from "viem";
import { getActiveChainId } from "@/lib/chain-config/opn";
import { getPublicClient } from "@/lib/rpc-client";
import { erc20Abi } from "@/lib/swap/abis";
import { getRegistryTokenByAddress } from "@/lib/token-registry";
import prisma from "../prisma";
import { NATIVE_OPN_ID, normalizeTokenRouteParam } from "./token-address";

const ZERO = "0x0000000000000000000000000000000000000000";

export type ResolvedTokenDetail = {
  id: string;
  contractAddress: string;
  name: string;
  symbol: string;
  chainId: number;
  featureFlags: string;
  creatorAddress: string;
  creatorUsername?: string | null;
  creatorVerified?: boolean;
  creatorFollowers?: number;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  description?: string | null;
  website?: string | null;
  github?: string | null;
  telegram?: string | null;
  twitter?: string | null;
  createdAt?: string | null;
  category?: string | null;
  liquidityLocked?: boolean;
  ownershipRenounced?: boolean;
  buyTaxBps?: number | null;
  sellTaxBps?: number | null;
  isNative?: boolean;
  isExternal?: boolean;
  isIndexed?: boolean;
  decimals?: number;
  totalSupply?: string | null;
};

export function buildNativeOpnDetail(): ResolvedTokenDetail {
  return {
    id: NATIVE_OPN_ID,
    contractAddress: "",
    name: "OPN",
    symbol: "OPN",
    chainId: getActiveChainId(),
    featureFlags: "0",
    creatorAddress: ZERO,
    description: "Native gas token of OPN Chain.",
    isNative: true,
    isExternal: true,
    isIndexed: false,
    decimals: 18,
  };
}

async function readErc20Metadata(address: string) {
  const client = getPublicClient();
  const addr = address as `0x${string}`;

  const [nameRes, symbolRes, decimalsRes, supplyRes] = await Promise.allSettled([
    client.readContract({ address: addr, abi: erc20Abi, functionName: "name" }),
    client.readContract({ address: addr, abi: erc20Abi, functionName: "symbol" }),
    client.readContract({ address: addr, abi: erc20Abi, functionName: "decimals" }),
    client.readContract({ address: addr, abi: erc20Abi, functionName: "totalSupply" }),
  ]);

  const symbol =
    symbolRes.status === "fulfilled" && typeof symbolRes.value === "string"
      ? symbolRes.value
      : null;
  if (!symbol) return null;

  const name =
    nameRes.status === "fulfilled" && typeof nameRes.value === "string" && nameRes.value.trim()
      ? nameRes.value
      : symbol;
  const decimals =
    decimalsRes.status === "fulfilled" ? Number(decimalsRes.value) : 18;
  const totalSupply =
    supplyRes.status === "fulfilled" && typeof supplyRes.value === "bigint"
      ? formatUnits(supplyRes.value, decimals)
      : null;

  return { name, symbol, decimals, totalSupply };
}

export async function resolveTokenDetail(
  rawAddress: string
): Promise<ResolvedTokenDetail | null> {
  const normalized = normalizeTokenRouteParam(rawAddress);
  if (!normalized) return null;

  if (normalized.kind === "native-opn") {
    return buildNativeOpnDetail();
  }

  const address = normalized.address;
  if (!isAddress(address)) return null;

  const registryHit = getRegistryTokenByAddress(address);
  if (registryHit && registryHit.isNative) {
    return buildNativeOpnDetail();
  }

  const token = await prisma.tokenProject.findUnique({
    where: { contractAddress: address },
    include: {
      creator: { include: { verification: true } },
      votes: true,
      liquidityLocks: { select: { id: true }, take: 1 },
      lpBurns: { select: { id: true }, take: 1 },
    },
  });

  if (token) {
    const creatorFollowers = await prisma.creatorFollow.count({
      where: { creatorWallet: token.creatorAddress.toLowerCase() },
    });

    const { votes, liquidityLocks, lpBurns, ...tokenFields } = token;

    return {
      ...tokenFields,
      featureFlags: token.featureFlags.toString(),
      createdAt: token.createdAt.toISOString(),
      creatorFollowers,
      creatorVerified: !!token.creator?.verification,
      creatorUsername: token.creator?.username ?? null,
      liquidityLocked: liquidityLocks.length > 0 || lpBurns.length > 0,
      isIndexed: true,
      isExternal: false,
    };
  }

  const onChain = await readErc20Metadata(address);
  if (!onChain) return null;

  if (registryHit) {
    return {
      id: registryHit.id,
      contractAddress: address,
      name: registryHit.name,
      symbol: registryHit.symbol,
      chainId: getActiveChainId(),
      featureFlags: "0",
      creatorAddress: ZERO,
      logoUrl: registryHit.logoUrl,
      description: `${registryHit.name} ecosystem token on OPN Chain.`,
      isExternal: true,
      isIndexed: false,
      decimals: registryHit.decimals,
      totalSupply: onChain.totalSupply,
    };
  }

  return {
    id: address,
    contractAddress: address,
    name: onChain.name,
    symbol: onChain.symbol,
    chainId: getActiveChainId(),
    featureFlags: "0",
    creatorAddress: ZERO,
    description: null,
    isExternal: true,
    isIndexed: false,
    decimals: onChain.decimals,
    totalSupply: onChain.totalSupply,
  };
}
