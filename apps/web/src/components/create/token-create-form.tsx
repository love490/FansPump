"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, usePublicClient, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { decodeEventLog, getEventSelector, isAddress, parseAbiItem, parseEther, zeroAddress } from "viem";
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
import { FACTORY_ADDRESS, opnChain } from "@/lib/wagmi";
import Link from "next/link";
import { AlertTriangle, Lock } from "lucide-react";

const FEATURE_ENTRIES = Object.entries(TOKEN_FEATURES) as [keyof typeof TOKEN_FEATURES, number][];

const SOCIAL_LINK_FIELDS = [
  { key: "website" as const, label: "Website", placeholder: "https://yourproject.com" },
  { key: "github" as const, label: "GitHub", placeholder: "https://github.com/your-org/your-repo" },
  { key: "telegram" as const, label: "Telegram", placeholder: "https://t.me/yourchannel" },
  { key: "twitter" as const, label: "X / Twitter", placeholder: "https://x.com/yourhandle" },
  { key: "discord" as const, label: "Discord", placeholder: "https://discord.gg/yourinvite" },
];

export function TokenCreateForm() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
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
  const [taxAllocTokens, setTaxAllocTokens] = useState<Record<string, string>>({});
  const [enabledTaxWallets, setEnabledTaxWallets] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const w of TAX_WALLETS) init[w] = true;
    return init;
  });
  const [taxWallets, setTaxWallets] = useState<Record<string, string>>({});
  const [taxBps, setTaxBps] = useState<Record<string, number>>({
    marketingBps: 2000,
    developmentBps: 2000,
    treasuryBps: 2000,
    communityBps: 2000,
    operationsBps: 1000,
    liquidityBps: 1000,
  });
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

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { data: receipt, isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });
  const [deployedToken, setDeployedToken] = useState<string | null>(null);
  const [extractFailed, setExtractFailed] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  const [manualToken, setManualToken] = useState("");

  const tokenCreatedEvent = useMemo(
    () =>
      parseAbiItem(
        "event TokenCreated(address indexed token, address indexed creator, string name, string symbol, uint256 featureFlags, uint256 initialSupply)"
      ),
    []
  );
  const tokenCreatedSelector = useMemo(() => getEventSelector(tokenCreatedEvent), [tokenCreatedEvent]);

  function toggleFeature(bit: number) {
    setSelectedFeatures((prev) =>
      prev.includes(bit) ? prev.filter((f) => f !== bit) : [...prev, bit]
    );
  }

  const taxTotal = Object.values(taxBps).reduce((a, b) => a + b, 0);
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

  const taxWalletsValid = useMemo(() => {
    for (const w of TAX_WALLETS) {
      if (!enabledTaxWallets[w]) continue;
      const addr = (taxWallets[w] ?? "").trim();
      if (!addr) return false;
      if (!isAddress(addr)) return false;
      if (addr.toLowerCase() === zeroAddress.toLowerCase()) return false;
    }
    return true;
  }, [enabledTaxWallets, taxWallets]);

  function toggleTaxWallet(w: (typeof TAX_WALLETS)[number]) {
    const nextEnabled = !enabledTaxWallets[w];
    setEnabledTaxWallets({ ...enabledTaxWallets, [w]: nextEnabled });
    if (!nextEnabled) {
      const bpsKey = `${w.replace("Wallet", "Bps")}` as keyof typeof taxBps;
      setTaxBps({ ...taxBps, [bpsKey]: 0 });
      const nextTokens = { ...taxAllocTokens };
      delete nextTokens[bpsKey];
      setTaxAllocTokens(nextTokens);
      setTaxWallets({ ...taxWallets, [w]: "" });
    } else {
      // If user enables a wallet and some allocation is still unassigned, give it the remainder by default.
      const bpsKey = `${w.replace("Wallet", "Bps")}` as keyof typeof taxBps;
      const remainder = Math.max(0, 10000 - taxTotal);
      if (remainder > 0) setTaxBps({ ...taxBps, [bpsKey]: remainder });
    }
  }

  function switchTaxAllocUnit(next: SupplyInputUnit) {
    if (next === taxAllocUnit) return;
    if (next === "tokens") {
      const nextTokens: Record<string, string> = {};
      for (const w of TAX_WALLETS) {
        const bpsKey = `${w.replace("Wallet", "Bps")}` as keyof typeof taxBps;
        nextTokens[bpsKey] = bpsToTokenAmountString(supply, taxBps[bpsKey] ?? 0);
      }
      setTaxAllocTokens(nextTokens);
    } else {
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
    setTaxBps({ ...taxBps, [bpsKey]: percentToAllocationBps(percentRaw) });
  }

  function setTaxAllocTokenAmount(bpsKey: string, tokenRaw: string) {
    setTaxAllocTokens({ ...taxAllocTokens, [bpsKey]: tokenRaw });
    setTaxBps({ ...taxBps, [bpsKey]: tokenAmountToBps(supply, tokenRaw) });
  }

  async function deploy() {
    if (!address) return;

    const flags = encodeFeatureFlags(selectedFeatures);
    const taxDist = {
      marketingWallet: (enabledTaxWallets.marketingWallet ? (taxWallets.marketingWallet ?? zeroAddress) : zeroAddress) as `0x${string}`,
      developmentWallet: (enabledTaxWallets.developmentWallet ? (taxWallets.developmentWallet ?? zeroAddress) : zeroAddress) as `0x${string}`,
      treasuryWallet: (enabledTaxWallets.treasuryWallet ? (taxWallets.treasuryWallet ?? zeroAddress) : zeroAddress) as `0x${string}`,
      communityWallet: (enabledTaxWallets.communityWallet ? (taxWallets.communityWallet ?? zeroAddress) : zeroAddress) as `0x${string}`,
      operationsWallet: (enabledTaxWallets.operationsWallet ? (taxWallets.operationsWallet ?? zeroAddress) : zeroAddress) as `0x${string}`,
      liquidityWallet: (enabledTaxWallets.liquidityWallet ? (taxWallets.liquidityWallet ?? zeroAddress) : zeroAddress) as `0x${string}`,
      marketingBps: taxBps.marketingBps,
      developmentBps: taxBps.developmentBps,
      treasuryBps: taxBps.treasuryBps,
      communityBps: taxBps.communityBps,
      operationsBps: taxBps.operationsBps,
      liquidityBps: taxBps.liquidityBps,
    };

    writeContract({
      address: FACTORY_ADDRESS,
      abi: factoryAbi,
      functionName: "createToken",
      value: parseEther(String(totalCreationFee)),
      args: [
        {
          name,
          symbol,
          initialSupply: parseEther(supply),
          featureFlags: BigInt(flags),
          maxWalletAmount: selectedFeatures.includes(TOKEN_FEATURES.MAX_WALLET)
            ? parseEther(maxWallet || "0")
            : 0n,
          maxTxAmount: selectedFeatures.includes(TOKEN_FEATURES.MAX_TX) ? parseEther(maxTx || "0") : 0n,
          buyTaxBps: hasTax ? buyTax : 0,
          sellTaxBps: hasTax ? sellTax : 0,
          taxDistribution: taxDist,
          antiBot: {
            launchGuardEnabled: selectedFeatures.includes(TOKEN_FEATURES.ANTI_BOT)
              ? antiBot.launchGuardEnabled
              : false,
            maxLaunchBuy: hasAntiBot ? maxLaunchBuyAmount : 0n,
            maxLaunchWallet: hasAntiBot ? maxLaunchWalletAmount : 0n,
            protectionDuration: BigInt(antiBot.protectionDuration),
          },
          owner: address,
        },
      ],
    });
  }

  const registerMetadata = useCallback(async (contractAddress: string) => {
    await fetch("/api/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contractAddress,
        chainId: opnChain.id,
        name,
        symbol,
        initialSupply: parseEther(supply).toString(),
        featureFlags: encodeFeatureFlags(selectedFeatures).toString(),
        creatorAddress: address,
        factoryAddress: FACTORY_ADDRESS,
        txHash,
        ...metadata,
        buyTaxBps: hasTax ? buyTax : null,
        sellTaxBps: hasTax ? sellTax : null,
        maxWallet: maxWallet || null,
        maxTx: maxTx || null,
      }),
    });
  }, [address, buyTax, hasTax, maxTx, maxWallet, metadata, name, selectedFeatures, sellTax, supply, symbol, txHash]);

  useEffect(() => {
    if (!receipt || !txHash || deployedToken) return;
    if (!publicClient) return;

    // Extract token address from factory TokenCreated event.
    let found = false;
    for (const log of receipt.logs ?? []) {
      if (!log?.topics?.length) continue;
      // Don't rely on log.address matching exactly (proxies / tooling can differ).
      if (log.topics[0]?.toLowerCase?.() !== tokenCreatedSelector.toLowerCase()) continue;
      try {
        const decoded = decodeEventLog({
          abi: [tokenCreatedEvent],
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName !== "TokenCreated") continue;
        const token = (decoded.args as { token?: string }).token;
        if (token && isAddress(token)) {
          setDeployedToken(token);
          found = true;
          return;
        }
      } catch {
        // ignore non-matching logs
      }
    }
    if (!found) setExtractFailed(true);
  }, [receipt, txHash, deployedToken, publicClient, tokenCreatedEvent, tokenCreatedSelector]);

  useEffect(() => {
    if (!deployedToken || registered || registering) return;
    setRegistering(true);
    setRegisterError(null);
    registerMetadata(deployedToken)
      .then(() => setRegistered(true))
      .catch((e) => setRegisterError(e instanceof Error ? e.message : "Failed to save token metadata"))
      .finally(() => setRegistering(false));
  }, [deployedToken, registered, registering, registerMetadata]);

  if (isSuccess && txHash) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle>Token deployed</CardTitle>
          <CardDescription>
            Transaction: {txHash}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!deployedToken ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Finalizing… extracting contract address from the transaction logs.
              </p>
              {extractFailed && (
                <div className="rounded-lg border bg-white/60 p-3">
                  <p className="text-sm text-red-600">
                    We couldn’t auto-detect the token address from the logs.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Paste the token contract address from the block explorer, and we’ll save it to “My Tokens”.
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
                        if (isAddress(v)) setDeployedToken(v);
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
              <div className="rounded-lg border bg-white/60 p-3">
                <p className="text-sm text-muted-foreground">Contract address</p>
                <p className="break-all font-mono text-sm">{deployedToken}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href={`/token/${deployedToken}`}>View token</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/token/${deployedToken}/liquidity`}>Add liquidity</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/token/${deployedToken}/ownership`}>Ownership</Link>
                </Button>
              </div>

              {registering ? (
                <p className="text-sm text-muted-foreground">Saving token to your “My Tokens”…</p>
              ) : registered ? (
                <p className="text-sm text-green-700">Saved. You’ll now see it in “My Tokens”.</p>
              ) : registerError ? (
                <p className="text-sm text-red-600">Couldn’t save to My Tokens: {registerError}</p>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
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
              <Input value={supply} onChange={(e) => setSupply(e.target.value)} type="number" />
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
                  Enter buy/sell tax and wallet splits as a percentage or as token amounts. On-chain values are
                  converted automatically.
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
                  <AmountUnitToggle unit={taxAllocUnit} onUnitChange={switchTaxAllocUnit} />
                </div>
                {TAX_WALLETS.map((w) => {
                  const bpsKey = `${w.replace("Wallet", "Bps")}` as keyof typeof taxBps;
                  const bps = taxBps[bpsKey] ?? 0;
                  const enabled = enabledTaxWallets[w];
                  return (
                    <div key={w} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <Label className="mb-0">{TAX_WALLET_LABELS[w]}</Label>
                        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={() => toggleTaxWallet(w)}
                            className="h-4 w-4"
                          />
                          Enable
                        </label>
                      </div>

                      {enabled ? (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <div>
                            <Label>{TAX_WALLET_LABELS[w]} address</Label>
                            <Input
                              placeholder="0x..."
                              value={taxWallets[w] ?? ""}
                              onChange={(e) => setTaxWallets({ ...taxWallets, [w]: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Allocation (% of tax)</Label>
                            {taxAllocUnit === "percent" ? (
                              <Input
                                value={bpsToPercentString(bps)}
                                onChange={(e) => setTaxAllocPercent(bpsKey, e.target.value)}
                                placeholder="e.g. 100"
                                inputMode="decimal"
                              />
                            ) : (
                              <Input
                                value={taxAllocTokens[bpsKey] ?? bpsToTokenAmountString(supply, bps)}
                                onChange={(e) => setTaxAllocTokenAmount(bpsKey, e.target.value)}
                                placeholder="e.g. 200000"
                                inputMode="decimal"
                              />
                            )}
                            <p className="mt-1 text-xs text-muted-foreground">
                              {`${(bps / 100).toFixed(2)}%`} · {bps} bps
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">Disabled (0%).</p>
                      )}
                    </div>
                  );
                })}
                <p className={taxTotal === 10000 ? "text-green-700 text-sm" : "text-red-600 text-sm"}>
                  Tax allocation total: {taxTotal / 100}% (must equal 100%)
                </p>
                {enabledTaxWalletCount === 0 && (
                  <p className="text-sm text-red-600">Enable at least one wallet for tax allocation.</p>
                )}
                {!taxWalletsValid && enabledTaxWalletCount > 0 && (
                  <p className="text-sm text-red-600">
                    Enter a valid wallet address for every enabled allocation.
                  </p>
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
                  (hasTax && taxTotal !== 10000) ||
                  (hasTax && !taxWalletsValid)
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
            <div className="sm:col-span-2 flex gap-2">
              <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
              <Button
                onClick={deploy}
                disabled={
                  !isConnected ||
                  isPending ||
                  confirming ||
                  (hasTax && taxTotal !== 10000) ||
                  (hasTax && !taxRatesValid)
                }
              >
                {isPending || confirming
                  ? "Deploying..."
                  : `Deploy token · ${totalCreationFee} ${TOKEN_CREATION_FEE_SYMBOL}`}
              </Button>
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
