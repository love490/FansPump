import { formatEther } from "viem";
import { getActiveChainId } from "@/lib/chain-config/opn";
import { getPublicClient } from "@/lib/rpc-client";
import prisma from "../prisma";
import { buildWalletRiskFlags } from "./risk-engine";
import * as explorer from "./blockscout";
import type { WalletScanResult, DeployedToken, ConnectedWallet, RiskLevel } from "./types";

export async function scanWallet(address: string): Promise<WalletScanResult> {
  const normalized = address.toLowerCase();
  const addr = normalized as `0x${string}`;
  const client = getPublicClient();

  const [balance, txCount, addressInfo] = await Promise.all([
    client.getBalance({ address: addr }).catch(() => 0n),
    client.getTransactionCount({ address: addr }).catch(() => 0),
    explorer.getAddressInfo(normalized),
  ]);

  const deployedTokens = await getDeployedTokens(normalized);
  const connectedWallets: ConnectedWallet[] = [];
  const { riskScore, riskFlags } = buildWalletRiskFlags({ deployedTokens, connectedWallets });

  const riskLevel: RiskLevel =
    riskScore >= 70 ? "DANGER" : riskScore >= 40 ? "CAUTION" : "SAFE";

  const firstSeen =
    (addressInfo?.creation_transaction_hash as string | undefined) ??
    (addressInfo?.created_at as string | undefined) ??
    "";

  const result: WalletScanResult = {
    address: normalized,
    nativeBalance: formatEther(balance as bigint),
    txCount,
    firstSeen,
    lastSeen: "",
    totalDeployed: deployedTokens.length,
    deployedTokens,
    riskScore,
    riskLevel,
    riskFlags,
    connectedWallets,
    scannedAt: new Date().toISOString(),
  };

  await prisma.walletScan
    .upsert({
      where: { address: normalized },
      create: {
        address: normalized,
        riskLevel,
        riskScore,
        data: result as object,
        scannedAt: new Date(),
      },
      update: {
        riskLevel,
        riskScore,
        data: result as object,
        scannedAt: new Date(),
      },
    })
    .catch(console.error);

  return result;
}

async function getDeployedTokens(address: string): Promise<DeployedToken[]> {
  const chainId = getActiveChainId();
  const tokens: DeployedToken[] = [];
  const seen = new Set<string>();

  const dbTokens = await prisma.tokenProject.findMany({
    where: { creatorAddress: address, chainId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      contractAddress: true,
      name: true,
      symbol: true,
      createdAt: true,
      trustScore: true,
      isScam: true,
      isHidden: true,
    },
  });

  for (const t of dbTokens) {
    const addr = t.contractAddress.toLowerCase();
    if (seen.has(addr)) continue;
    seen.add(addr);
    tokens.push({
      address: addr,
      name: t.name,
      symbol: t.symbol,
      deployedAt: t.createdAt.toISOString(),
      currentTrustScore: t.trustScore > 0 ? Math.round(t.trustScore) : null,
      isFansPumpToken: true,
      status: t.isScam ? "rugged" : t.isHidden ? "dead" : "active",
    });
  }

  const data = await explorer.getDeployedContracts(address);
  const txs = (data?.items as Array<Record<string, unknown>> | undefined) ?? [];

  for (const tx of txs.slice(0, 30)) {
    const created = tx.created_contract as Record<string, unknown> | undefined;
    const contractAddress = (created?.hash as string | undefined)?.toLowerCase();
    if (!contractAddress || seen.has(contractAddress)) continue;
    seen.add(contractAddress);

    const fansPumpToken = await prisma.tokenProject
      .findUnique({
        where: { contractAddress },
        select: {
          name: true,
          symbol: true,
          trustScore: true,
          isScam: true,
          isHidden: true,
        },
      })
      .catch(() => null);

    tokens.push({
      address: contractAddress,
      name: fansPumpToken?.name ?? (created?.name as string | undefined) ?? "Unknown",
      symbol: fansPumpToken?.symbol ?? "???",
      deployedAt: (tx.timestamp as string | undefined) ?? "",
      currentTrustScore:
        fansPumpToken && fansPumpToken.trustScore > 0
          ? Math.round(fansPumpToken.trustScore)
          : null,
      isFansPumpToken: !!fansPumpToken,
      status: fansPumpToken?.isScam
        ? "rugged"
        : fansPumpToken?.isHidden
          ? "dead"
          : fansPumpToken
            ? "active"
            : "unknown",
    });
  }

  return tokens;
}
