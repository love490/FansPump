import type {
  RiskFlag,
  ContractSafetyResult,
  LiquiditySafetyResult,
  MarketIntegrityResult,
  DeployedToken,
  ConnectedWallet,
} from "./types";

export function buildTokenRiskFlags(data: {
  contractSafety: ContractSafetyResult;
  liquiditySafety: LiquiditySafetyResult;
  marketIntegrity: MarketIntegrityResult;
}): RiskFlag[] {
  const { contractSafety: c, liquiditySafety: l, marketIntegrity: m } = data;
  const flags: RiskFlag[] = [];

  if (!c.sourceVerified) {
    flags.push({
      id: "source_unverified",
      severity: "high",
      label: "Source not verified",
      description: "Contract source is not publicly verified on the block explorer.",
    });
  }

  if (!c.ownershipRenounced) {
    flags.push({
      id: "owner_not_renounced",
      severity: "medium",
      label: "Owner can rug",
      description: "Contract owner has not renounced. They can modify or drain the contract.",
    });
  }

  if (c.mintAuthorityExists) {
    flags.push({
      id: "mint_exists",
      severity: "high",
      label: "Mint function exists",
      description: "Owner can mint unlimited tokens, inflating and devaluing supply.",
    });
  }

  if (c.honeypotRisk) {
    flags.push({
      id: "honeypot",
      severity: "critical",
      label: "Honeypot risk",
      description: "Token may trap buyers — selling could be blocked.",
    });
  }

  if (!l.hasLiquidity) {
    flags.push({
      id: "no_liquidity",
      severity: "high",
      label: "No liquidity detected",
      description: "No liquidity pool found. Token may not be tradeable.",
    });
  }

  if (l.hasLiquidity && !l.locked) {
    flags.push({
      id: "liquidity_unlocked",
      severity: "high",
      label: "Liquidity not locked",
      description: "Developer can remove liquidity at any time.",
    });
  }

  if (m.top10HolderPercent > 70) {
    flags.push({
      id: "whale_concentration",
      severity: "medium",
      label: "High whale concentration",
      description: `Top 10 wallets hold ${m.top10HolderPercent}% of supply.`,
    });
  }

  if (m.holders < 20) {
    flags.push({
      id: "low_holders",
      severity: "medium",
      label: "Very few holders",
      description: `Only ${m.holders} unique holders detected.`,
    });
  }

  if (m.washTradingDetected) {
    flags.push({
      id: "wash_trading",
      severity: "high",
      label: "Wash trading detected",
      description: "Volume appears artificially inflated.",
    });
  }

  return flags;
}

export function buildWalletRiskFlags(data: {
  deployedTokens: DeployedToken[];
  connectedWallets: ConnectedWallet[];
}): { riskScore: number; riskFlags: RiskFlag[] } {
  const { deployedTokens, connectedWallets } = data;

  const rugCount = deployedTokens.filter((t) => t.status === "rugged").length;
  const totalDeployed = deployedTokens.length;
  const highLinks = connectedWallets.filter((w) => w.confidence > 0.7).length;

  const flags: RiskFlag[] = [];

  if (rugCount >= 2) {
    flags.push({
      id: "serial_rugger",
      severity: "critical",
      label: "Serial rug history",
      description: `This wallet has rugged ${rugCount} tokens.`,
    });
  } else if (rugCount === 1) {
    flags.push({
      id: "rug_history",
      severity: "high",
      label: "Rug pull detected",
      description: "At least one token from this wallet was rugged.",
    });
  }

  if (totalDeployed > 10) {
    flags.push({
      id: "high_volume_deployer",
      severity: "medium",
      label: "High volume deployer",
      description: `Deployed ${totalDeployed} contracts — may indicate farming behavior.`,
    });
  }

  if (highLinks > 0) {
    flags.push({
      id: "linked_wallets",
      severity: "medium",
      label: "Linked wallets detected",
      description: `${highLinks} wallet(s) strongly linked to this address.`,
    });
  }

  let riskScore = 0;
  if (rugCount >= 2) riskScore += 60;
  else if (rugCount === 1) riskScore += 35;
  if (totalDeployed > 10) riskScore += 15;
  riskScore += Math.min(highLinks * 10, 25);

  return { riskScore: Math.min(riskScore, 100), riskFlags: flags };
}

export function scoreToRiskLevel(trustScore: number): "SAFE" | "CAUTION" | "DANGER" {
  if (trustScore >= 70) return "SAFE";
  if (trustScore >= 40) return "CAUTION";
  return "DANGER";
}
