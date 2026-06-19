export type AddressType = "token" | "wallet" | "unknown";
export type RiskLevel = "SAFE" | "CAUTION" | "DANGER" | "UNKNOWN";

export interface RiskFlag {
  id: string;
  label: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
}

export interface TokenScanResult {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  isFansPumpToken: boolean;
  trustScore: number;
  riskLevel: RiskLevel;
  contractSafety: ContractSafetyResult;
  liquiditySafety: LiquiditySafetyResult;
  marketIntegrity: MarketIntegrityResult;
  deployer: string;
  deployerRisk: RiskLevel;
  riskFlags: RiskFlag[];
  scannedAt: string;
}

export interface ContractSafetyResult {
  score: number;
  sourceVerified: boolean;
  ownershipRenounced: boolean;
  mintAuthorityExists: boolean;
  honeypotRisk: boolean;
}

export interface LiquiditySafetyResult {
  score: number;
  hasLiquidity: boolean;
  liquidityUSD: number;
  locked: boolean;
  lockDurationDays: number;
  lpConcentration: number;
  removalEvents: number;
}

export interface MarketIntegrityResult {
  score: number;
  holders: number;
  top10HolderPercent: number;
  sniperWallets: number;
  washTradingDetected: boolean;
}

export interface WalletScanResult {
  address: string;
  nativeBalance: string;
  txCount: number;
  firstSeen: string;
  lastSeen: string;
  totalDeployed: number;
  deployedTokens: DeployedToken[];
  riskScore: number;
  riskLevel: RiskLevel;
  riskFlags: RiskFlag[];
  connectedWallets: ConnectedWallet[];
  scannedAt: string;
}

export interface DeployedToken {
  address: string;
  name: string;
  symbol: string;
  deployedAt: string;
  currentTrustScore: number | null;
  isFansPumpToken: boolean;
  status: "active" | "dead" | "rugged" | "unknown";
}

export interface ConnectedWallet {
  address: string;
  confidence: number;
  signals: string[];
  riskLevel: RiskLevel;
}

export type ScanApiResponse =
  | { type: "token"; result: TokenScanResult }
  | { type: "wallet"; result: WalletScanResult };

export function riskLevelToTrustTier(riskLevel: RiskLevel): "LOW" | "MEDIUM" | "HIGH" {
  if (riskLevel === "SAFE") return "HIGH";
  if (riskLevel === "CAUTION") return "MEDIUM";
  return "LOW";
}
