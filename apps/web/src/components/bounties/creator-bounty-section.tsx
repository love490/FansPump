"use client";

import { apiUrl } from "@/lib/api";

import { useEffect, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BOUNTY_REWARD_TYPES,
  ONCHAIN_REQUIREMENTS,
  VERIFICATION_METHODS,
  type BountyListItem,
  type BountyTaskType,
} from "@/lib/bounties";
import { BountyCard } from "@/components/bounties/bounty-card";
import { BountyTaskPicker } from "@/components/bounties/bounty-task-picker";
import {
  mergeBountyVerificationConfig,
  resolvePrimaryTaskType,
  validateBountyTaskSelection,
  type SocialBountyActionId,
} from "@/lib/bounty-task-config";
import { CircleDollarSign } from "lucide-react";

type CreatorToken = {
  contractAddress: string;
  symbol: string;
  name: string;
};

export function CreatorBountySection({
  creatorWallet,
  creatorTokens = [],
  onRefresh,
}: {
  creatorWallet: string;
  creatorTokens?: CreatorToken[];
  onRefresh?: () => void;
}) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const isOwner = address?.toLowerCase() === creatorWallet.toLowerCase();

  const [bounties, setBounties] = useState<BountyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskTypes, setTaskTypes] = useState<BountyTaskType[]>(["CUSTOM"]);
  const [socialActions, setSocialActions] = useState<SocialBountyActionId[]>([]);
  const [requirements, setRequirements] = useState("");
  const [rewardType, setRewardType] = useState<(typeof BOUNTY_REWARD_TYPES)[number]["id"]>("OPN");
  const [rewardAmount, setRewardAmount] = useState("");
  const [rewardDescription, setRewardDescription] = useState("");
  const [rewardTokenSymbol, setRewardTokenSymbol] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [verificationMethod, setVerificationMethod] =
    useState<(typeof VERIFICATION_METHODS)[number]["id"]>("MANUAL");
  const [onchainRequirement, setOnchainRequirement] =
    useState<(typeof ONCHAIN_REQUIREMENTS)[number]["id"]>("HOLD_TOKEN");
  const [onchainMinAmount, setOnchainMinAmount] = useState("1");

  function loadBounties() {
    setLoading(true);
    fetch(apiUrl(`/api/bounties?creator=${creatorWallet}&scope=mine&limit=50`))
      .then((r) => r.json())
      .then((d) => setBounties(d.bounties ?? []))
      .catch(() => setBounties([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadBounties();
  }, [creatorWallet]);

  async function createBounty() {
    if (!address || !isOwner) return;
    setCreating(true);
    setError(null);
    setMessage(null);
    try {
      const taskError = validateBountyTaskSelection(taskTypes, socialActions);
      if (taskError) throw new Error(taskError);

      if (rewardType === "TOKEN" && !rewardTokenSymbol.trim() && !tokenAddress.trim()) {
        throw new Error("Enter a token symbol (e.g. WIF, MAGO) or select a listed token");
      }

      let parsedMaxParticipants: number | null = null;
      if (maxParticipants.trim()) {
        parsedMaxParticipants = Number(maxParticipants);
        if (!Number.isInteger(parsedMaxParticipants) || parsedMaxParticipants < 1 || parsedMaxParticipants > 10000) {
          throw new Error("Max participants must be between 1 and 10000, or leave empty for unlimited");
        }
      }

      const primaryTaskType = resolvePrimaryTaskType(taskTypes);
      const onchainConfig =
        verificationMethod === "ONCHAIN"
          ? {
              requirementType: onchainRequirement,
              tokenAddress: onchainRequirement === "HOLD_TOKEN" && tokenAddress ? tokenAddress : undefined,
              minAmount:
                onchainRequirement === "HOLD_TOKEN" || onchainRequirement === "STAKE"
                  ? String(Number(onchainMinAmount) * 1e18)
                  : undefined,
              pairId: onchainRequirement === "ADD_LIQUIDITY" ? "OPN" : undefined,
              minLpAmount: onchainRequirement === "ADD_LIQUIDITY" ? "1" : undefined,
            }
          : null;
      const verificationConfig = mergeBountyVerificationConfig(
        onchainConfig,
        taskTypes,
        socialActions
      );

      const prefix = process.env.NEXT_PUBLIC_CREATOR_ACTION_MESSAGE_PREFIX ?? "FansPump Creator Action";
      const msg = `${prefix}\nCreate bounty\nWallet: ${address.toLowerCase()}\nTime: ${Date.now()}`;
      const signature = await signMessageAsync({ message: msg });

      const res = await fetch(apiUrl("/api/bounties"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          message: msg,
          signature,
          title,
          description,
          taskType: primaryTaskType,
          taskTypes,
          socialActions,
          requirements: requirements || null,
          rewardType,
          rewardAmount,
          rewardDescription:
            rewardType === "TOKEN"
              ? rewardTokenSymbol.trim().toUpperCase() || null
              : rewardType === "CUSTOM"
                ? rewardDescription || null
                : null,
          maxParticipants: parsedMaxParticipants,
          endsAt: endsAt ? new Date(endsAt).toISOString() : null,
          tokenAddress: tokenAddress || null,
          verificationMethod,
          verificationConfig,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create bounty");

      setMessage("Bounty created.");
      setTitle("");
      setDescription("");
      setTaskTypes(["CUSTOM"]);
      setSocialActions([]);
      setRequirements("");
      setRewardAmount("");
      setRewardDescription("");
      setRewardTokenSymbol("");
      setMaxParticipants("");
      setEndsAt("");
      setTokenAddress("");
      setShowForm(false);
      loadBounties();
      onRefresh?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create bounty");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="mb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <CircleDollarSign className="h-5 w-5 text-primary" /> Earn Bounties
        </h2>
        {isOwner && (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "Create bounty"}
          </Button>
        )}
      </div>

      {isOwner && showForm && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">New bounty task</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="bounty-title">Title</Label>
                <Input
                  id="bounty-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Promote our launch on X"
                  maxLength={120}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="bounty-description">Description</Label>
                <textarea
                  id="bounty-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain what participants need to do and how rewards are paid."
                  rows={4}
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <BountyTaskPicker
                  taskTypes={taskTypes}
                  socialActions={socialActions}
                  onTaskTypesChange={setTaskTypes}
                  onSocialActionsChange={setSocialActions}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bounty-max">Max participants (optional)</Label>
                <Input
                  id="bounty-max"
                  type="number"
                  min={1}
                  max={10000}
                  placeholder="Leave empty for unlimited"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bounty-reward-type">Reward type</Label>
                <select
                  id="bounty-reward-type"
                  value={rewardType}
                  onChange={(e) => setRewardType(e.target.value as typeof rewardType)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {BOUNTY_REWARD_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bounty-reward-amount">Reward amount</Label>
                <Input
                  id="bounty-reward-amount"
                  value={rewardAmount}
                  onChange={(e) => setRewardAmount(e.target.value)}
                  placeholder="100"
                />
              </div>
              {rewardType === "CUSTOM" && (
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="bounty-reward-desc">Custom reward details</Label>
                  <Input
                    id="bounty-reward-desc"
                    value={rewardDescription}
                    onChange={(e) => setRewardDescription(e.target.value)}
                    placeholder="Whitelist spot, merch pack, etc."
                  />
                </div>
              )}
              {rewardType === "TOKEN" && (
                <div className="space-y-3 sm:col-span-2">
                  <div className="space-y-2">
                    <Label htmlFor="bounty-token-symbol">Token symbol</Label>
                    <Input
                      id="bounty-token-symbol"
                      value={rewardTokenSymbol}
                      onChange={(e) => setRewardTokenSymbol(e.target.value.toUpperCase())}
                      placeholder="WIF, MAGO, PEPE…"
                      maxLength={20}
                    />
                    <p className="text-xs text-muted-foreground">
                      Shown on Earn as the reward token (e.g. 100 MAGO).
                    </p>
                  </div>
                  {creatorTokens.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="bounty-token">Or pick your listed token (optional)</Label>
                      <select
                        id="bounty-token"
                        value={tokenAddress}
                        onChange={(e) => {
                          const addr = e.target.value;
                          setTokenAddress(addr);
                          const picked = creatorTokens.find((t) => t.contractAddress === addr);
                          if (picked) setRewardTokenSymbol(picked.symbol.toUpperCase());
                        }}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">None — use symbol only</option>
                        {creatorTokens.map((t) => (
                          <option key={t.contractAddress} value={t.contractAddress}>
                            {t.name} (${t.symbol})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="bounty-verification">Verification</Label>
                <select
                  id="bounty-verification"
                  value={verificationMethod}
                  onChange={(e) =>
                    setVerificationMethod(e.target.value as typeof verificationMethod)
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {VERIFICATION_METHODS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              {verificationMethod === "ONCHAIN" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="bounty-onchain-req">On-chain requirement</Label>
                    <select
                      id="bounty-onchain-req"
                      value={onchainRequirement}
                      onChange={(e) =>
                        setOnchainRequirement(e.target.value as typeof onchainRequirement)
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {ONCHAIN_REQUIREMENTS.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {(onchainRequirement === "HOLD_TOKEN" || onchainRequirement === "STAKE") && (
                    <div className="space-y-2">
                      <Label htmlFor="bounty-min-amount">Minimum amount</Label>
                      <Input
                        id="bounty-min-amount"
                        type="number"
                        min={0}
                        step="any"
                        value={onchainMinAmount}
                        onChange={(e) => setOnchainMinAmount(e.target.value)}
                      />
                    </div>
                  )}
                </>
              )}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="bounty-requirements">Requirements (optional)</Label>
                <textarea
                  id="bounty-requirements"
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="Must include project hashtag, proof link, etc."
                  rows={2}
                  className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="bounty-ends">End date (optional)</Label>
                <Input
                  id="bounty-ends"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {message && <p className="text-sm text-green-600">{message}</p>}
            <Button type="button" disabled={creating || !title || !description || !rewardAmount} onClick={() => void createBounty()}>
              {creating ? "Creating…" : "Publish bounty"}
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading bounties…</p>
      ) : bounties.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {isOwner ? "No bounties yet. Create one to reward your community." : "No bounties from this creator yet."}
        </p>
      ) : (
        <div className="space-y-3">
          {bounties.map((bounty) => (
            <BountyCard key={bounty.id} bounty={bounty} showJoin={false} />
          ))}
        </div>
      )}
    </section>
  );
}
