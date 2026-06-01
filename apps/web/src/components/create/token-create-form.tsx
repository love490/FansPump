"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, zeroAddress } from "viem";
import {
  TOKEN_FEATURES,
  BUY_TAX_OPTIONS,
  SELL_TAX_OPTIONS,
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
import { percentOfTokenSupply } from "@/lib/token-supply";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { MetadataImageField } from "@/components/create/metadata-image-field";
import { factoryAbi } from "@/lib/abis/factory";
import { FACTORY_ADDRESS, opnChain } from "@/lib/wagmi";
import { formatTaxBps } from "@/lib/utils";
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
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [supply, setSupply] = useState("1000000");
  const [selectedFeatures, setSelectedFeatures] = useState<number[]>([]);
  const [maxWallet, setMaxWallet] = useState("");
  const [maxTx, setMaxTx] = useState("");
  const [buyTax, setBuyTax] = useState(250);
  const [sellTax, setSellTax] = useState(250);
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
    maxLaunchBuyPercent: "1",
    maxLaunchWallet: "50000",
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
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  function toggleFeature(bit: number) {
    setSelectedFeatures((prev) =>
      prev.includes(bit) ? prev.filter((f) => f !== bit) : [...prev, bit]
    );
  }

  const taxTotal = Object.values(taxBps).reduce((a, b) => a + b, 0);
  const hasTax = selectedFeatures.includes(TOKEN_FEATURES.TAXABLE);
  const totalCreationFee = calculateCreationFeeOpn(selectedFeatures);
  const maxLaunchBuyAmount = percentOfTokenSupply(supply, antiBot.maxLaunchBuyPercent);

  async function deploy() {
    if (!address) return;

    const flags = encodeFeatureFlags(selectedFeatures);
    const taxDist = {
      marketingWallet: (taxWallets.marketingWallet ?? zeroAddress) as `0x${string}`,
      developmentWallet: (taxWallets.developmentWallet ?? zeroAddress) as `0x${string}`,
      treasuryWallet: (taxWallets.treasuryWallet ?? zeroAddress) as `0x${string}`,
      communityWallet: (taxWallets.communityWallet ?? zeroAddress) as `0x${string}`,
      operationsWallet: (taxWallets.operationsWallet ?? zeroAddress) as `0x${string}`,
      liquidityWallet: (taxWallets.liquidityWallet ?? zeroAddress) as `0x${string}`,
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
            maxLaunchBuy: selectedFeatures.includes(TOKEN_FEATURES.ANTI_BOT) ? maxLaunchBuyAmount : 0n,
            maxLaunchWallet: parseEther(antiBot.maxLaunchWallet),
            protectionDuration: BigInt(antiBot.protectionDuration),
          },
          owner: address,
        },
      ],
    });
  }

  async function registerMetadata(contractAddress: string) {
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
  }

  if (isSuccess && txHash) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle>Token deployed</CardTitle>
          <CardDescription>
            Transaction: {txHash}. Register project metadata from your dashboard or token page.
          </CardDescription>
        </CardHeader>
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
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Buy tax (max 5%)</Label>
                    <select
                      className="flex h-10 w-full rounded-md border px-3 text-sm"
                      value={buyTax}
                      onChange={(e) => setBuyTax(Number(e.target.value))}
                    >
                      {BUY_TAX_OPTIONS.map((b) => (
                        <option key={b} value={b} disabled={b > MAX_TAX_BPS}>
                          {formatTaxBps(b)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Sell tax (max 5%)</Label>
                    <select
                      className="flex h-10 w-full rounded-md border px-3 text-sm"
                      value={sellTax}
                      onChange={(e) => setSellTax(Number(e.target.value))}
                    >
                      {SELL_TAX_OPTIONS.map((b) => (
                        <option key={b} value={b}>
                          {formatTaxBps(b)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {TAX_WALLETS.map((w) => (
                  <div key={w} className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <Label>{TAX_WALLET_LABELS[w]} address</Label>
                      <Input
                        placeholder="0x..."
                        value={taxWallets[w] ?? ""}
                        onChange={(e) => setTaxWallets({ ...taxWallets, [w]: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Allocation (bps)</Label>
                      <Input
                        type="number"
                        value={taxBps[`${w.replace("Wallet", "Bps")}` as keyof typeof taxBps] ?? 0}
                        onChange={(e) =>
                          setTaxBps({ ...taxBps, [`${w.replace("Wallet", "Bps")}`]: Number(e.target.value) })
                        }
                      />
                    </div>
                  </div>
                ))}
                <p className={taxTotal === 10000 ? "text-green-700 text-sm" : "text-red-600 text-sm"}>
                  Tax allocation total: {taxTotal / 100}% (must equal 100%)
                </p>
              </>
            )}
            {selectedFeatures.includes(TOKEN_FEATURES.ANTI_BOT) && (
              <div className="grid gap-4 sm:grid-cols-2 border-t pt-4">
                <div>
                  <Label>Max buy at create (% of total supply)</Label>
                  <Input
                    value={antiBot.maxLaunchBuyPercent}
                    onChange={(e) => setAntiBot({ ...antiBot, maxLaunchBuyPercent: e.target.value })}
                    placeholder="e.g. 1%"
                    inputMode="decimal"
                  />
                  {maxLaunchBuyAmount > 0n && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      ≈ {(Number(maxLaunchBuyAmount) / 1e18).toLocaleString()} tokens at {antiBot.maxLaunchBuyPercent.replace("%", "")}% of supply
                    </p>
                  )}
                </div>
                <div>
                  <Label>Max wallet at create</Label>
                  <Input value={antiBot.maxLaunchWallet} onChange={(e) => setAntiBot({ ...antiBot, maxLaunchWallet: e.target.value })} />
                </div>
                <div>
                  <Label>Protection duration (seconds)</Label>
                  <Input value={antiBot.protectionDuration} onChange={(e) => setAntiBot({ ...antiBot, protectionDuration: e.target.value })} />
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={() => setStep(4)} disabled={hasTax && taxTotal !== 10000}>Continue</Button>
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
                disabled={!isConnected || isPending || confirming || (hasTax && taxTotal !== 10000)}
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
