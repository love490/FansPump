"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useChainId, usePublicClient, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { isAddress, parseEther, zeroAddress } from "viem";
import {
  TOKEN_FEATURES,
  TAX_WALLETS,
  TAX_WALLET_LABELS,
  encodeFeatureFlags,
  FEATURE_LABELS,
  FEATURE_DESCRIPTIONS,
  calculateCreationFeeOpn,
  getFeatureExtraFee,
  TOKEN_CREATION_FEE_SYMBOL,
  MAX_TAX_BPS,
} from "@iopn/shared";
import { Button } from "@/components/ui/button";
import { FeatureInfo } from "@/components/ui/feature-info";
import { CreationFee } from "@/components/create/creation-fee";
import { SupplyAmountInput } from "@/components/create/supply-amount-input";
import { TaxRateInput } from "@/components/create/tax-rate-input";
import { AmountUnitToggle } from "@/components/create/amount-unit-toggle";
import {
  bpsToPercentString,
  bpsToTokenAmountString,
  bpsToTaxPerToken,
  percentToAllocationBps,
  toSupplyWei,
  tokenAmountToBps,
  type SupplyInputUnit,
} from "@/lib/token-supply";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { MetadataImageField } from "@/components/create/metadata-image-field";
import { factoryAbi } from "@/lib/abis/factory";
import {
  FACTORY_ADDRESS,
  OPN_EXPLORER_BASE,
  getFactoryConfigError,
  isFactoryConfigured,
  opnChain,
} from "@/lib/wagmi";
import { isReceiptSuccess, resolveDeployedTokenAddress } from "@/lib/token-deploy";
import { registerTokenMetadata } from "@/lib/token-register";
import Link from "next/link";
import { AlertTriangle, Lock } from "lucide-react";

const FEATURE_ENTRIES = Object.entries(TOKEN_FEATURES) as [keyof typeof TOKEN_FEATURES, number][];

const EMPTY_TAX_BPS: Record<string, number> = {
  marketingBps: 0,
  developmentBps: 0,
  treasuryBps: 0,
  communityBps: 0,
  operationsBps: 0,
  liquidityBps: 0,
};

const SOCIAL_LINK_FIELDS = [
  { key: "website" as const, label: "Website", placeholder: "https://yourproject.com" },
  { key: "github" as const, label: "GitHub", placeholder: "https://github.com/your-org/your-repo" },
  { key: "telegram" as const, label: "Telegram", placeholder: "https://t.me/yourchannel" },
  { key: "twitter" as const, label: "X / Twitter", placeholder: "https://x.com/yourhandle" },
  { key: "discord" as const, label: "Discord", placeholder: "https://discord.gg/yourinvite" },
];

export function TokenCreateForm() {
  const router = useRouter();
  const { address, isConnected, chain } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const factoryConfigError = getFactoryConfigError();
  const factoryReady = isFactoryConfigured(FACTORY_ADDRESS);
  const wrongNetwork = isConnected && chainId !== opnChain.id;
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [supply, setSupply] = useState("1000000");
  const [selectedFeatures, setSelectedFeatures] = useState<number[]>([]);
  const [maxWallet, setMaxWallet] = useState("");
  const [maxTx, setMaxTx] = useState("");
  const [buyTax, setBuyTax] = useState(250);
  const [sellTax, setSellTax] = useState(250);
  const [buyTaxUnit, setBuyTaxUnit] = useState<SupplyInputUnit>("percent");
  const [sellTaxUnit, setSellTaxUnit] = useState<SupplyInputUnit>("percent");
  const [buyTaxPercent, setBuyTaxPercent] = useState("2.5");
  const [sellTaxPercent, setSellTaxPercent] = useState("2.5");
  const [buyTaxTokensPerTransfer, setBuyTaxTokensPerTransfer] = useState(() => bpsToTaxPerToken(250));
  const [sellTaxTokensPerTransfer, setSellTaxTokensPerTransfer] = useState(() => bpsToTaxPerToken(250));
  const [taxAllocUnit, setTaxAllocUnit] = useState<SupplyInputUnit>("percent");
  const [taxAllocPercents, setTaxAllocPercents] = useState<Record<string, string>>({});
  const [taxAllocTokens, setTaxAllocTokens] = useState<Record<string, string>>({});
  const [enabledTaxWallets, setEnabledTaxWallets] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const w of TAX_WALLETS) init[w] = false;
    return init;
  });
  const [taxBps, setTaxBps] = useState<Record<string, number>>({ ...EMPTY_TAX_BPS });
  const [antiBot, setAntiBot] = useState({
    launchGuardEnabled: true,
    maxLaunchBuyUnit: "percent" as SupplyInputUnit,
    maxLaunchBuyValue: "1",
    maxLaunchWalletUnit: "tokens" as SupplyInputUnit,
    maxLaunchWalletValue: "50000",
    protectionDuration: "3600",
  });
  const [metadata, setMetadata] = useState({
    logoUrl: "",
    bannerUrl: "",
    description: "",
    website: "",
    telegram: "",
    twitter: "",
    discord: "",
    github: "",
  });

  const featureFlags = useMemo(
    () => encodeFeatureFlags(selectedFeatures),
    [selectedFeatures]
  );

  const { writeContract, data: txHash, isPending, error: writeError, reset: resetWrite } = useWriteContract();
  const { data: onChainCreationFee } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: factoryAbi,
    functionName: "calculateCreationFee",
    args: [BigInt(featureFlags)],
    query: { enabled: factoryReady },
  });
  const { data: factoryPaused } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: factoryAbi,
    functionName: "paused",
    query: { enabled: factoryReady },
  });
  const { data: receipt, isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });
  const [deployError, setDeployError] = useState<string | null>(null);
  const [deployedToken, setDeployedToken] = useState<string | null>(null);
  const [extractFailed, setExtractFailed] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const [resolvingAddress, setResolvingAddress] = useState(false);

  function toggleFeature(bit: number) {
    setSelectedFeatures((prev) =>
      prev.includes(bit) ? prev.filter((f) => f !== bit) : [...prev, bit]
    );
  }

  const enabledTaxTotal = useMemo(
    () =>
      TAX_WALLETS.reduce((sum, w) => {
        if (!enabledTaxWallets[w]) return sum;
        const bpsKey = `${w.replace("Wallet", "Bps")}` as keyof typeof taxBps;
        return sum + (taxBps[bpsKey] ?? 0);
      }, 0),
    [enabledTaxWallets, taxBps]
  );
  const hasTax = selectedFeatures.includes(TOKEN_FEATURES.TAXABLE);
  const hasAntiBot = selectedFeatures.includes(TOKEN_FEATURES.ANTI_BOT);
  const totalCreationFee = calculateCreationFeeOpn(selectedFeatures);
  const maxLaunchBuyAmount = toSupplyWei(supply, antiBot.maxLaunchBuyUnit, antiBot.maxLaunchBuyValue);
  const maxLaunchWalletAmount = toSupplyWei(
    supply,
    antiBot.maxLaunchWalletUnit,
    antiBot.maxLaunchWalletValue
  );
  const taxRatesValid = buyTax <= MAX_TAX_BPS && sellTax <= MAX_TAX_BPS;

  const enabledTaxWalletCount = useMemo(
    () => TAX_WALLETS.filter((w) => enabledTaxWallets[w]).length,
    [enabledTaxWallets]
  );

  const allTaxWalletsEnabled = enabledTaxWalletCount === TAX_WALLETS.length;
  const someTaxWalletsEnabled = enabledTaxWalletCount > 0 && !allTaxWalletsEnabled;

  function toggleTaxWallet(w: (typeof TAX_WALLETS)[number]) {
    const nextEnabled = !enabledTaxWallets[w];
    setEnabledTaxWallets({ ...enabledTaxWallets, [w]: nextEnabled });
    if (!nextEnabled) {
      const bpsKey = `${w.replace("Wallet", "Bps")}` as keyof typeof taxBps;
      setTaxBps({ ...taxBps, [bpsKey]: 0 });
      const nextTokens = { ...taxAllocTokens };
      delete nextTokens[bpsKey];
      setTaxAllocTokens(nextTokens);
      const nextPercents = { ...taxAllocPercents };
      delete nextPercents[bpsKey];
      setTaxAllocPercents(nextPercents);
    }
  }

  function toggleAllTaxWallets(enable: boolean) {
    const nextEnabled: Record<string, boolean> = {};
    for (const w of TAX_WALLETS) nextEnabled[w] = enable;
    setEnabledTaxWallets(nextEnabled);
    if (!enable) {
      setTaxBps({ ...EMPTY_TAX_BPS });
      setTaxAllocTokens({});
      setTaxAllocPercents({});
    }
  }

  function switchTaxAllocUnit(next: SupplyInputUnit) {
    if (next === taxAllocUnit) return;
    if (next === "tokens") {
      const nextTokens: Record<string, string> = {};
      for (const w of TAX_WALLETS) {
        const bpsKey = `${w.replace("Wallet", "Bps")}` as keyof typeof taxBps;
        const percent = taxAllocPercents[bpsKey]?.trim();
        if (percent) {
          nextTokens[bpsKey] = bpsToTokenAmountString(supply, percentToAllocationBps(percent));
        } else {
          nextTokens[bpsKey] = taxAllocTokens[bpsKey] ?? bpsToTokenAmountString(supply, taxBps[bpsKey] ?? 0);
        }
      }
      setTaxAllocTokens(nextTokens);
    } else {
      const nextPercents: Record<string, string> = {};
      for (const w of TAX_WALLETS) {
        const bpsKey = `${w.replace("Wallet", "Bps")}` as keyof typeof taxBps;
        const tokens = taxAllocTokens[bpsKey];
        if (tokens?.trim()) {
          const bps = tokenAmountToBps(supply, tokens);
          nextPercents[bpsKey] = bps > 0 ? bpsToPercentString(bps) : "";
        } else if ((taxBps[bpsKey] ?? 0) > 0) {
          nextPercents[bpsKey] = bpsToPercentString(taxBps[bpsKey] ?? 0);
        }
      }
      setTaxAllocPercents(nextPercents);
      const nextBps = { ...taxBps };
      for (const w of TAX_WALLETS) {
        const bpsKey = `${w.replace("Wallet", "Bps")}` as keyof typeof taxBps;
        const tokens = taxAllocTokens[bpsKey];
        if (tokens?.trim()) {
          nextBps[bpsKey] = tokenAmountToBps(supply, tokens);
        }
      }
      setTaxBps(nextBps);
    }
    setTaxAllocUnit(next);
  }

  function setTaxAllocPercent(bpsKey: string, percentRaw: string) {
    setTaxAllocPercents({ ...taxAllocPercents, [bpsKey]: percentRaw });
    setTaxBps({ ...taxBps, [bpsKey]: percentToAllocationBps(percentRaw) });
  }

  function setTaxAllocTokenAmount(bpsKey: string, tokenRaw: string) {
    setTaxAllocTokens({ ...taxAllocTokens, [bpsKey]: tokenRaw });
    setTaxBps({ ...taxBps, [bpsKey]: tokenAmountToBps(supply, tokenRaw) });
  }

  function parseTokenAmount(raw: string, label: string): bigint {
    const cleaned = raw.replace(/,/g, "").trim();
    if (!cleaned) throw new Error(`Enter a valid ${label}`);
    try {
      const amount = parseEther(cleaned);
      if (amount <= 0n) throw new Error(`${label} must be greater than zero`);
      return amount;
    } catch {
      throw new Error(`Enter a valid ${label}`);
    }
  }

  const deployBlockReason = useMemo(() => {
    if (!isConnected) return "Connect your wallet to deploy.";
    if (!factoryReady) return factoryConfigError ?? "Factory contract is not configured.";
    if (factoryPaused) return "Token factory is paused. Try again later.";
    if (wrongNetwork) return `Switch your wallet to ${opnChain.name} (chain ${opnChain.id}).`;
    if (!name.trim() || !symbol.trim()) return "Token name and symbol are required.";
    if (hasTax && !taxRatesValid) return "Buy and sell tax must be 5% or less.";
    if (hasTax && enabledTaxWalletCount === 0) return "Enable at least one tax allocation slot.";
    if (hasTax && enabledTaxTotal !== 10000) {
      return `Tax allocation must total 100% (currently ${(enabledTaxTotal / 100).toFixed(2)}%).`;
    }
    if (selectedFeatures.includes(TOKEN_FEATURES.MAX_WALLET) && !maxWallet.trim()) {
      return "Enter a max wallet amount.";
    }
    if (selectedFeatures.includes(TOKEN_FEATURES.MAX_TX) && !maxTx.trim()) {
      return "Enter a max transaction amount.";
    }
    if (hasAntiBot && antiBot.launchGuardEnabled) {
      if (maxLaunchBuyAmount <= 0n || maxLaunchWalletAmount <= 0n) {
        return "Anti-bot max buy and max wallet must be greater than zero.";
      }
      if (!/^\d+$/.test(antiBot.protectionDuration.trim())) {
        return "Enter a valid protection duration in seconds.";
      }
    }
    return null;
  }, [
    isConnected,
    factoryReady,
    factoryConfigError,
    factoryPaused,
    wrongNetwork,
    name,
    symbol,
    hasTax,
    taxRatesValid,
    enabledTaxWalletCount,
    enabledTaxTotal,
    selectedFeatures,
    maxWallet,
    maxTx,
    hasAntiBot,
    antiBot.launchGuardEnabled,
    antiBot.protectionDuration,
    maxLaunchBuyAmount,
    maxLaunchWalletAmount,
  ]);

  async function deploy() {
    if (!address) return;
    setDeployError(null);
    resetWrite();

    if (deployBlockReason) {
      setDeployError(deployBlockReason);
      return;
    }

    const configError = getFactoryConfigError();
    if (configError) {
      setDeployError(configError);
      console.error("[deploy] Factory config:", configError);
      return;
    }

    if (chainId !== opnChain.id) {
      const msg = `Wrong network. Switch to ${opnChain.name} (chain ID ${opnChain.id}). Currently on chain ${chainId}.`;
      setDeployError(msg);
      console.error("[deploy] Wrong chain:", chainId, "expected", opnChain.id);
      return;
    }

    if (!publicClient) {
      setDeployError("Wallet RPC not available. Refresh and try again.");
      return;
    }

    try {
      const bytecode = await publicClient.getBytecode({ address: FACTORY_ADDRESS });
      if (!bytecode || bytecode === "0x") {
        const msg = `Factory contract not found at ${FACTORY_ADDRESS} on ${opnChain.name}. Verify NEXT_PUBLIC_FACTORY_ADDRESS.`;
        setDeployError(msg);
        console.error("[deploy] No bytecode at factory:", FACTORY_ADDRESS);
        return;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not verify factory contract on-chain.";
      setDeployError(msg);
      return;
    }

    let initialSupply: bigint;
    let maxWalletAmount: bigint;
    let maxTxAmount: bigint;
    let protectionDuration: bigint;

    try {
      initialSupply = parseTokenAmount(supply, "initial supply");
      maxWalletAmount = selectedFeatures.includes(TOKEN_FEATURES.MAX_WALLET)
        ? parseTokenAmount(maxWallet, "max wallet amount")
        : 0n;
      maxTxAmount = selectedFeatures.includes(TOKEN_FEATURES.MAX_TX)
        ? parseTokenAmount(maxTx, "max transaction amount")
        : 0n;
      protectionDuration = hasAntiBot ? BigInt(antiBot.protectionDuration.trim()) : 0n;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid token configuration.";
      setDeployError(msg);
      return;
    }

    const deploymentFee =
      typeof onChainCreationFee === "bigint"
        ? onChainCreationFee
        : parseEther(String(totalCreationFee));

    console.log("[deploy] Deploying token…");
    console.log("[deploy] Factory Address:", FACTORY_ADDRESS);
    console.log("[deploy] Chain:", chainId);
    console.log("[deploy] Deployment Fee:", deploymentFee.toString(), "wei");

    const taxDist = {
      marketingWallet: zeroAddress,
      developmentWallet: zeroAddress,
      treasuryWallet: zeroAddress,
      communityWallet: zeroAddress,
      operationsWallet: zeroAddress,
      liquidityWallet: zeroAddress,
      marketingBps: enabledTaxWallets.marketingWallet ? taxBps.marketingBps : 0,
      developmentBps: enabledTaxWallets.developmentWallet ? taxBps.developmentBps : 0,
      treasuryBps: enabledTaxWallets.treasuryWallet ? taxBps.treasuryBps : 0,
      communityBps: enabledTaxWallets.communityWallet ? taxBps.communityBps : 0,
      operationsBps: enabledTaxWallets.operationsWallet ? taxBps.operationsBps : 0,
      liquidityBps: enabledTaxWallets.liquidityWallet ? taxBps.liquidityBps : 0,
    };

    const tokenConfig = {
      name: name.trim(),
      symbol: symbol.trim(),
      initialSupply,
      featureFlags: BigInt(featureFlags),
      maxWalletAmount,
      maxTxAmount,
      buyTaxBps: hasTax ? buyTax : 0,
      sellTaxBps: hasTax ? sellTax : 0,
      taxDistribution: taxDist,
      antiBot: {
        launchGuardEnabled: hasAntiBot ? antiBot.launchGuardEnabled : false,
        maxLaunchBuy: hasAntiBot ? maxLaunchBuyAmount : 0n,
        maxLaunchWallet: hasAntiBot ? maxLaunchWalletAmount : 0n,
        protectionDuration,
      },
      owner: address,
    } as const;

    try {
      await publicClient.simulateContract({
        account: address,
        address: FACTORY_ADDRESS,
        abi: factoryAbi,
        functionName: "createToken",
        value: deploymentFee,
        args: [tokenConfig],
      });
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message.includes("reverted")
            ? "Transaction would fail on-chain. Check tax allocation totals, feature settings, and creation fee."
            : e.message
          : "Could not simulate deployment.";
      setDeployError(msg);
      console.error("[deploy] Simulation failed:", e);
      return;
    }

    writeContract(
      {
        address: FACTORY_ADDRESS,
        abi: factoryAbi,
        functionName: "createToken",
        value: deploymentFee,
        args: [tokenConfig],
      },
      {
        onSuccess: (hash) => {
          console.log("[deploy] Transaction Hash:", hash);
        },
        onError: (err) => {
          const msg =
            err instanceof Error
              ? err.message
              : "shortMessage" in err && typeof err.shortMessage === "string"
                ? err.shortMessage
                : "Token deployment failed";
          setDeployError(msg);
          console.error("[deploy] writeContract error:", err);
        },
      }
    );
  }

  const registerMetadata = useCallback(
    async (contractAddress: string) => {
      if (!address) throw new Error("Wallet not connected");

      return registerTokenMetadata({
        contractAddress: contractAddress.toLowerCase(),
        chainId: opnChain.id,
        name,
        symbol,
        initialSupply: parseEther(supply).toString(),
        featureFlags: encodeFeatureFlags(selectedFeatures).toString(),
        creatorAddress: address.toLowerCase(),
        factoryAddress: FACTORY_ADDRESS.toLowerCase(),
        txHash,
        ...metadata,
        buyTaxBps: hasTax ? buyTax : null,
        sellTaxBps: hasTax ? sellTax : null,
        maxWallet: maxWallet || null,
        maxTx: maxTx || null,
      });
    },
    [address, buyTax, hasTax, maxTx, maxWallet, metadata, name, selectedFeatures, sellTax, supply, symbol, txHash]
  );

  useEffect(() => {
    if (!receipt || !txHash || deployedToken || !publicClient || !address) return;
    if (!isReceiptSuccess(receipt)) {
      console.error("[deploy] Transaction reverted:", txHash);
      setExtractFailed(true);
      return;
    }

    let cancelled = false;
    setResolvingAddress(true);
    setExtractFailed(false);

    console.log("[deploy] Waiting for confirmation… receipt received for:", txHash);

    resolveDeployedTokenAddress(publicClient, receipt, FACTORY_ADDRESS, address)
      .then((token) => {
        if (cancelled) return;
        console.log("[deploy] Contract address:", token);
        setDeployedToken(token);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Could not extract contract address";
        console.error("[deploy] Address extraction failed:", msg);
        setExtractFailed(true);
      })
      .finally(() => {
        if (!cancelled) setResolvingAddress(false);
      });

    return () => {
      cancelled = true;
    };
  }, [receipt, txHash, deployedToken, publicClient, address]);

  useEffect(() => {
    if (txHash) console.log("[deploy] Transaction Hash:", txHash);
  }, [txHash]);

  useEffect(() => {
    if (!deployedToken || registered || registering) return;
    setRegistering(true);
    setRegisterError(null);
    registerMetadata(deployedToken)
      .then((result) => {
        setRegistered(true);
        console.log("[deploy] Registered token id:", result.token.id);
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : "Failed to save token metadata";
        setRegisterError(msg);
        console.error("[deploy] Database save failed:", e);
      })
      .finally(() => setRegistering(false));
  }, [deployedToken, registered, registering, registerMetadata]);

  useEffect(() => {
    if (registered && deployedToken) {
      router.push(`/token/${deployedToken}`);
    }
  }, [registered, deployedToken, router]);

  const txSucceeded = receipt ? isReceiptSuccess(receipt) : false;
  const txReverted = receipt ? !isReceiptSuccess(receipt) : false;

  if (isSuccess && txHash && txReverted) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle>Token deployment failed</CardTitle>
          <CardDescription>Transaction reverted on-chain: {txHash}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-700">
            Your wallet may still show an OPN deduction due to <strong>gas fees</strong>, but the token contract
            was not created.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Check the transaction in the block explorer for the exact revert reason, then try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isSuccess && txHash && txSucceeded) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle>Token created successfully</CardTitle>
          <CardDescription>
            Transaction:{" "}
            <a
              href={`${OPN_EXPLORER_BASE.replace(/\/$/, "")}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs underline"
            >
              {txHash.slice(0, 10)}…{txHash.slice(-8)}
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!deployedToken ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {resolvingAddress
                  ? "Finalizing… extracting contract address from the transaction logs."
                  : extractFailed
                    ? "Could not automatically detect the contract address."
                    : "Waiting for contract address…"}
              </p>
              {extractFailed && (
                <div className="rounded-lg border bg-white/60 p-3">
                  <p className="text-sm text-red-600">
                    TokenCreated event not found. The factory address may be wrong or the transaction did not
                    deploy a token.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Paste the token contract address from the block explorer.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Input
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      placeholder="0x..."
                      className="min-w-[260px]"
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        const v = manualToken.trim();
                        if (isAddress(v)) setDeployedToken(v.toLowerCase());
                      }}
                      disabled={!isAddress(manualToken.trim())}
                    >
                      Use address
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-iopn-200 bg-iopn-50 p-4">
                <p className="text-sm font-medium text-iopn-800">Contract address</p>
                <p className="mt-1 break-all font-mono text-sm font-semibold text-iopn-600">
                  {deployedToken}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href={`/token/${deployedToken}`}>View token</Link>
                </Button>
                <Button asChild variant="outline">
                  <a
                    href={`${OPN_EXPLORER_BASE.replace(/\/$/, "")}/address/${deployedToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View explorer
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/token/${deployedToken}/liquidity`}>Add liquidity</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/token/${deployedToken}/ownership`}>Manage ownership</Link>
                </Button>
              </div>

              {registering ? (
                <p className="text-sm text-muted-foreground">Saving token and redirecting…</p>
              ) : registered ? (
                <p className="text-sm text-green-700">Saved. Redirecting to your token page…</p>
              ) : registerError ? (
                <p className="text-sm text-red-600">Couldn&apos;t save to My Tokens: {registerError}</p>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  const activeDeployError = deployError ?? writeError?.message ?? null;

  return (
    <div className="space-y-6">
      {!factoryReady && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-700" />
            <div>
              <p className="text-sm font-medium text-red-900">Factory contract not configured</p>
              <p className="mt-1 text-sm text-red-800">
                {factoryConfigError ??
                  "Set NEXT_PUBLIC_FACTORY_ADDRESS to your deployed TokenFactory on OPN Testnet before users can create tokens."}
              </p>
              {FACTORY_ADDRESS && (
                <p className="mt-2 font-mono text-xs text-red-700">Current value: {FACTORY_ADDRESS}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {factoryPaused && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-700" />
            <p className="text-sm text-red-900">
              The token factory is currently paused. Deployment is disabled until it is unpaused.
            </p>
          </CardContent>
        </Card>
      )}

      {wrongNetwork && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-700" />
            <p className="text-sm text-amber-900">
              Wrong network. Switch your wallet to <strong>{opnChain.name}</strong> (chain ID {opnChain.id}
              ). Currently connected to chain {chainId}
              {chain?.name ? ` (${chain.name})` : ""}.
            </p>
          </CardContent>
        </Card>
      )}

      {activeDeployError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-red-900">Deployment error</p>
            <p className="mt-1 text-sm text-red-800">{activeDeployError}</p>
          </CardContent>
        </Card>
      )}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="flex gap-3 pt-6">
          <Lock className="h-5 w-5 shrink-0 text-amber-700" />
          <p className="text-sm text-amber-900">
            Selected features become <strong>permanently immutable</strong> after deployment. They cannot be
            added or removed.
          </p>
        </CardContent>
      </Card>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Token basics</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Project Token" />
            </div>
            <div>
              <Label>Symbol</Label>
              <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="MPT" />
            </div>
            <div className="sm:col-span-2">
              <Label>Initial supply</Label>
              <Input value={supply} onChange={(e) => setSupply(e.target.value)} inputMode="decimal" placeholder="1000000" />
            </div>
            <Button className="sm:col-span-2" onClick={() => setStep(2)} disabled={!name || !symbol}>
              Continue
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Immutable features</CardTitle>
            <CardDescription>Select only what your project needs</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {FEATURE_ENTRIES.map(([key, bit]) => {
              const extraFee = getFeatureExtraFee(key);
              return (
              <label
                key={key}
                className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
              >
                <Checkbox checked={selectedFeatures.includes(bit)} onCheckedChange={() => toggleFeature(bit)} />
                <span className="flex flex-1 items-center justify-between gap-2 min-w-0">
                  <span className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-medium">{FEATURE_LABELS[key]}</span>
                    {extraFee > 0 && (
                      <span className="text-xs text-iopn-600">+{extraFee} {TOKEN_CREATION_FEE_SYMBOL}</span>
                    )}
                  </span>
                  <FeatureInfo title={FEATURE_LABELS[key]} description={FEATURE_DESCRIPTIONS[key]} />
                </span>
              </label>
            );
            })}
            <div className="sm:col-span-2">
              <CreationFee selectedFeatures={selectedFeatures} />
            </div>
            {selectedFeatures.includes(TOKEN_FEATURES.MAX_WALLET) && (
              <div className="sm:col-span-2">
                <Label>Max wallet (tokens)</Label>
                <Input value={maxWallet} onChange={(e) => setMaxWallet(e.target.value)} />
              </div>
            )}
            {selectedFeatures.includes(TOKEN_FEATURES.MAX_TX) && (
              <div className="sm:col-span-2">
                <Label>Max transaction (tokens)</Label>
                <Input value={maxTx} onChange={(e) => setMaxTx(e.target.value)} />
              </div>
            )}
            <div className="sm:col-span-2 flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(hasTax || selectedFeatures.includes(TOKEN_FEATURES.ANTI_BOT) ? 3 : 4)}>
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Tax & anti-bot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasTax && (
              <>
                <p className="text-sm text-muted-foreground">
                  Set buy/sell tax rates and allocation splits now. Wallet addresses are configured
                  after deployment on the token&apos;s Ownership page.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TaxRateInput
                    label="Buy tax (max 5%)"
                    kind="buy"
                    unit={buyTaxUnit}
                    onUnitChange={setBuyTaxUnit}
                    bps={buyTax}
                    onBpsChange={setBuyTax}
                    percentValue={buyTaxPercent}
                    onPercentValueChange={setBuyTaxPercent}
                    tokensPerTransferValue={buyTaxTokensPerTransfer}
                    onTokensPerTransferValueChange={setBuyTaxTokensPerTransfer}
                  />
                  <TaxRateInput
                    label="Sell tax (max 5%)"
                    kind="sell"
                    unit={sellTaxUnit}
                    onUnitChange={setSellTaxUnit}
                    bps={sellTax}
                    onBpsChange={setSellTax}
                    percentValue={sellTaxPercent}
                    onPercentValueChange={setSellTaxPercent}
                    tokensPerTransferValue={sellTaxTokensPerTransfer}
                    onTokensPerTransferValueChange={setSellTaxTokensPerTransfer}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
                  <Label className="mb-0">Tax wallet allocation</Label>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                      <Checkbox
                        checked={allTaxWalletsEnabled ? true : someTaxWalletsEnabled ? "indeterminate" : false}
                        onCheckedChange={(checked) => toggleAllTaxWallets(checked === true)}
                      />
                      Select all
                    </label>
                    <AmountUnitToggle unit={taxAllocUnit} onUnitChange={switchTaxAllocUnit} />
                  </div>
                </div>
                {TAX_WALLETS.map((w) => {
                  const bpsKey = `${w.replace("Wallet", "Bps")}` as keyof typeof taxBps;
                  const bps = taxBps[bpsKey] ?? 0;
                  const enabled = enabledTaxWallets[w];
                  return (
                    <div key={w} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <Label className="mb-0">{TAX_WALLET_LABELS[w]}</Label>
                        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                          <Checkbox checked={enabled} onCheckedChange={() => toggleTaxWallet(w)} />
                          Enable
                        </label>
                      </div>

                      {enabled ? (
                        <div className="mt-3">
                          <Label>
                            {taxAllocUnit === "percent" ? "Allocation (% of tax)" : "Allocation (tokens)"}
                          </Label>
                          {taxAllocUnit === "percent" ? (
                            <Input
                              value={taxAllocPercents[bpsKey] ?? ""}
                              onChange={(e) => setTaxAllocPercent(bpsKey, e.target.value)}
                              placeholder="e.g. 20"
                              inputMode="decimal"
                            />
                          ) : (
                            <Input
                              value={taxAllocTokens[bpsKey] ?? ""}
                              onChange={(e) => setTaxAllocTokenAmount(bpsKey, e.target.value)}
                              placeholder="Token amount"
                              inputMode="decimal"
                            />
                          )}
                          {bps > 0 && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {`${(bps / 100).toFixed(2)}%`} · {bps} bps
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">Disabled (0%).</p>
                      )}
                    </div>
                  );
                })}
                <p className={enabledTaxTotal === 10000 ? "text-green-700 text-sm" : "text-red-600 text-sm"}>
                  Tax allocation total: {(enabledTaxTotal / 100).toFixed(2)}% (must equal 100%)
                </p>
                {enabledTaxWalletCount === 0 && (
                  <p className="text-sm text-red-600">Enable at least one allocation slot.</p>
                )}
              </>
            )}
            {hasAntiBot && (
              <div className="grid gap-4 sm:grid-cols-2 border-t pt-4">
                <SupplyAmountInput
                  label="Max buy at create"
                  description="Limit per purchase during the launch guard period."
                  supply={supply}
                  unit={antiBot.maxLaunchBuyUnit}
                  onUnitChange={(maxLaunchBuyUnit) => setAntiBot({ ...antiBot, maxLaunchBuyUnit })}
                  value={antiBot.maxLaunchBuyValue}
                  onChange={(maxLaunchBuyValue) => setAntiBot({ ...antiBot, maxLaunchBuyValue })}
                />
                <SupplyAmountInput
                  label="Max wallet at create"
                  description="Maximum tokens any wallet can hold during protection."
                  supply={supply}
                  unit={antiBot.maxLaunchWalletUnit}
                  onUnitChange={(maxLaunchWalletUnit) => setAntiBot({ ...antiBot, maxLaunchWalletUnit })}
                  value={antiBot.maxLaunchWalletValue}
                  onChange={(maxLaunchWalletValue) => setAntiBot({ ...antiBot, maxLaunchWalletValue })}
                />
                <div>
                  <Label>Protection duration (seconds)</Label>
                  <Input
                    value={antiBot.protectionDuration}
                    onChange={(e) => setAntiBot({ ...antiBot, protectionDuration: e.target.value })}
                  />
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button
                onClick={() => setStep(4)}
                disabled={
                  (hasTax && !taxRatesValid) ||
                  (hasTax && enabledTaxWalletCount === 0) ||
                  (hasTax && enabledTaxTotal !== 10000)
                }
              >
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Project metadata</CardTitle>
            <CardDescription>Stored off-chain for discovery (on-chain features remain immutable)</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <MetadataImageField
              label="Project logo"
              hint="Square image works best. Shown on token cards and your project page."
              value={metadata.logoUrl}
              onChange={(logoUrl) => setMetadata({ ...metadata, logoUrl })}
              variant="logo"
              urlPlaceholder="https://yourproject.com/logo.png"
            />
            <MetadataImageField
              label="Project banner"
              hint="Wide image for your project header. Recommended 1200×400 or similar."
              value={metadata.bannerUrl}
              onChange={(bannerUrl) => setMetadata({ ...metadata, bannerUrl })}
              variant="banner"
              urlPlaceholder="https://yourproject.com/banner.png"
            />
            {SOCIAL_LINK_FIELDS.map(({ key, label, placeholder }) => (
              <div key={key}>
                <Label>{label}</Label>
                <Input
                  type="url"
                  value={metadata[key]}
                  onChange={(e) => setMetadata({ ...metadata, [key]: e.target.value })}
                  placeholder={placeholder}
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <textarea
                className="flex min-h-[100px] w-full rounded-md border px-3 py-2 text-sm"
                value={metadata.description}
                onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
                placeholder="Tell the community what your project is about…"
              />
            </div>
            <div className="sm:col-span-2">
              <CreationFee selectedFeatures={selectedFeatures} />
            </div>
            <div className="sm:col-span-2 flex flex-col gap-2">
              {deployBlockReason && (
                <p className="text-sm text-amber-800">{deployBlockReason}</p>
              )}
              <div className="flex gap-2">
              <Button variant="outline" type="button" onClick={() => setStep(3)}>Back</Button>
              <Button
                type="button"
                onClick={() => void deploy()}
                disabled={Boolean(deployBlockReason) || isPending || confirming}
              >
                {isPending || confirming
                  ? "Deploying..."
                  : `Deploy token · ${totalCreationFee} ${TOKEN_CREATION_FEE_SYMBOL}`}
              </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isConnected && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4" /> Connect wallet to deploy
        </p>
      )}
    </div>
  );
}
