"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { adminFetch } from "@/lib/admin-session";
import { formatAdminApiError } from "@/lib/admin/api-error";
import { BountyTaskPicker } from "@/components/bounties/bounty-task-picker";
import { QuizBuilder } from "@/components/quiz/quiz-builder";
import {
  mergeBountyVerificationConfig,
  resolvePrimaryTaskType,
  validateBountyTaskSelection,
  type BountyTaskStep,
  type SocialBountyActionId,
} from "@/lib/bounty-task-config";
import { defaultQuizDraft, quizDraftToPayload, validateQuizDraft, type QuizDraft } from "@/lib/quiz";
import { BountyXpLeaderboard } from "@/components/bounties/bounty-xp-leaderboard";
import type { BountyRewardType, BountyTaskType, BountyVerificationMethod } from "@/lib/bounties";
import { VERIFICATION_METHODS } from "@/lib/bounties";
import { shortenAddress } from "@/lib/utils";

type BountyRow = {
  id: string;
  title: string;
  status: string;
  taskType: string;
  rewardType: string;
  rewardAmount: string;
  xpReward?: number;
  participantCount: number;
  isFeatured: boolean;
  creatorWallet: string;
  creatorUsername?: string | null;
};

const emptyForm = {
  title: "",
  description: "",
  verificationMethod: "MANUAL" as BountyVerificationMethod,
  taskTypes: ["CUSTOM"] as BountyTaskType[],
  socialActions: [] as SocialBountyActionId[],
  taskSteps: [] as BountyTaskStep[],
  quiz: defaultQuizDraft(),
  rewardType: "XP" as BountyRewardType,
  rewardAmount: "0",
  quizXpPoints: "",
  rewardTokenSymbol: "",
  maxParticipants: "",
  tokenAddress: "",
  endsAt: "",
  isFeatured: false,
};

export function EarnAdminSection() {
  const [bounties, setBounties] = useState<BountyRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leaderboardWallet, setLeaderboardWallet] = useState("");

  const creatorOptions = useMemo(() => {
    return [...new Set(bounties.map((b) => b.creatorWallet.toLowerCase()))];
  }, [bounties]);

  useEffect(() => {
    if (!leaderboardWallet && creatorOptions.length > 0) {
      setLeaderboardWallet(creatorOptions[0]);
    }
  }, [creatorOptions, leaderboardWallet]);

  const load = useCallback(() => {
    adminFetch("/api/admin/bounties")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { bounties?: BountyRow[] }) => setBounties(data.bounties ?? []))
      .catch(() => setBounties([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createBounty() {
    setLoading(true);
    setMessage(null);
    setError(null);

    if (form.title.trim().length < 3) {
      setError("Title must be at least 3 characters");
      setLoading(false);
      return;
    }
    if (form.description.trim().length < 10) {
      setError("Description must be at least 10 characters");
      setLoading(false);
      return;
    }

    const taskError =
      form.verificationMethod === "QUIZ"
        ? validateQuizDraft(form.quiz)
        : validateBountyTaskSelection(form.taskTypes, form.socialActions, form.taskSteps);
    if (taskError) {
      setError(taskError);
      setLoading(false);
      return;
    }

    if (form.rewardType === "TOKEN" && !form.rewardTokenSymbol.trim() && !form.tokenAddress.trim()) {
      setError("Enter a token symbol (e.g. WIF, MAGO) or a token contract address");
      setLoading(false);
      return;
    }

    if (form.maxParticipants.trim()) {
      const max = Number(form.maxParticipants);
      if (!Number.isInteger(max) || max < 1 || max > 10000) {
        setError("Max participants must be a whole number between 1 and 10000, or leave empty for unlimited");
        setLoading(false);
        return;
      }
    }

    if (form.verificationMethod === "QUIZ") {
      const parsedQuizXp = Number(form.quizXpPoints);
      if (!Number.isInteger(parsedQuizXp) || parsedQuizXp < 1 || parsedQuizXp > 10000) {
        setError("Set quiz XP points (1–10,000)");
        setLoading(false);
        return;
      }
    }

    const primaryTaskType =
      form.verificationMethod === "QUIZ" ? "CUSTOM" : resolvePrimaryTaskType(form.taskTypes);
    const verificationConfig =
      form.verificationMethod === "QUIZ"
        ? null
        : mergeBountyVerificationConfig(null, form.taskTypes, form.socialActions, {
            taskSteps: form.taskSteps,
          });

    try {
      const res = await adminFetch("/api/admin/bounties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          taskType: primaryTaskType,
          taskTypes: form.verificationMethod === "QUIZ" ? ["CUSTOM"] : form.taskTypes,
          socialActions: form.verificationMethod === "QUIZ" ? [] : form.socialActions,
          verificationMethod: form.verificationMethod,
          verificationConfig,
          quiz: form.verificationMethod === "QUIZ" ? quizDraftToPayload(form.quiz) : undefined,
          rewardType: form.rewardType,
          rewardAmount: form.rewardAmount.trim() || "0",
          quizXpPoints: form.verificationMethod === "QUIZ" ? Number(form.quizXpPoints) : undefined,
          rewardDescription:
            form.rewardType === "TOKEN" ? form.rewardTokenSymbol.trim().toUpperCase() || null : null,
          maxParticipants: form.maxParticipants.trim() ? Number(form.maxParticipants) : null,
          tokenAddress: form.tokenAddress.trim() || null,
          endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
          isFeatured: form.isFeatured,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(formatAdminApiError(data, "Create failed"));
      setForm(emptyForm);
      setMessage("Bounty created.");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setLoading(false);
    }
  }

  async function patchBounty(id: string, patch: Record<string, unknown>) {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/bounties/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(formatAdminApiError(data, "Update failed"));
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  async function removeBounty(id: string) {
    if (!confirm("Delete this bounty permanently?")) return;
    setLoading(true);
    try {
      const res = await adminFetch(`/api/admin/bounties/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Earn — All quests</CardTitle>
          <CardDescription>
            Manage every bounty on the public Earn page — platform quests and creator-published quests.
            New admin quests use the platform wallet automatically; creator quests appear here for moderation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Quest type</Label>
              <select
                value={form.verificationMethod}
                onChange={(e) =>
                  setForm({
                    ...form,
                    verificationMethod: e.target.value as BountyVerificationMethod,
                  })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {VERIFICATION_METHODS.filter((m) => m.id === "MANUAL" || m.id === "QUIZ").map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id === "QUIZ" ? "Quiz (multiple choice)" : "Tasks (social & custom)"}
                  </option>
                ))}
              </select>
            </div>
            {form.verificationMethod === "MANUAL" ? (
              <div className="space-y-2 sm:col-span-2">
                <BountyTaskPicker
                  taskTypes={form.taskTypes}
                  socialActions={form.socialActions}
                  taskSteps={form.taskSteps}
                  onTaskTypesChange={(taskTypes) => setForm({ ...form, taskTypes })}
                  onSocialActionsChange={(socialActions) => setForm({ ...form, socialActions })}
                  onTaskStepsChange={(taskSteps) => setForm({ ...form, taskSteps })}
                />
              </div>
            ) : (
              <div className="space-y-2 sm:col-span-2">
                <Label>Quiz XP points</Label>
                <Input
                  type="number"
                  min={1}
                  max={10000}
                  value={form.quizXpPoints}
                  onChange={(e) => setForm({ ...form, quizXpPoints: e.target.value })}
                  placeholder="e.g. 25"
                />
                <p className="text-xs text-muted-foreground">
                  Set how much XP participants earn for passing the quiz.
                </p>
                <QuizBuilder
                  value={form.quiz}
                  onChange={(quiz: QuizDraft) => setForm({ ...form, quiz })}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Optional on-chain bonus type</Label>
              <select
                value={form.rewardType}
                onChange={(e) =>
                  setForm({ ...form, rewardType: e.target.value as BountyRewardType })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {["OPN", "TOKEN", "CUSTOM", "XP"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Bonus amount (optional)</Label>
              <Input
                value={form.rewardAmount}
                onChange={(e) => setForm({ ...form, rewardAmount: e.target.value })}
                placeholder="0 — XP is set per task above"
              />
            </div>
            {form.rewardType === "TOKEN" && (
              <div className="space-y-2 sm:col-span-2">
                <Label>Token symbol</Label>
                <Input
                  value={form.rewardTokenSymbol}
                  onChange={(e) =>
                    setForm({ ...form, rewardTokenSymbol: e.target.value.toUpperCase() })
                  }
                  placeholder="WIF, MAGO, PEPE…"
                  maxLength={20}
                />
                <p className="text-xs text-muted-foreground">
                  Displayed on Earn (e.g. 100 MAGO). Optional contract address below if listed on platform.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Max participants (optional)</Label>
              <Input
                type="number"
                min={1}
                max={10000}
                placeholder="Leave empty for unlimited"
                value={form.maxParticipants}
                onChange={(e) => setForm({ ...form, maxParticipants: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Token contract (optional)</Label>
              <Input
                className="font-mono text-xs"
                value={form.tokenAddress}
                onChange={(e) => setForm({ ...form, tokenAddress: e.target.value })}
                placeholder="0x… if linked to a platform token"
              />
            </div>
            <div className="space-y-2">
              <Label>Ends at (optional)</Label>
              <Input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
              />
              Featured on Earn page
            </label>
          </div>
          {message && <p className="text-sm text-emerald-600">{message}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="button" disabled={loading} onClick={() => void createBounty()}>
            Create bounty
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {bounties.length === 0 && (
          <p className="text-sm text-muted-foreground">No bounties yet. Create one above.</p>
        )}
        {bounties.map((bounty) => (
          <Card key={bounty.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
              <div>
                <p className="font-semibold">{bounty.title}</p>
                <p className="text-sm text-muted-foreground">
                  {bounty.xpReward ? `${bounty.xpReward} XP` : `${bounty.rewardAmount} ${bounty.rewardType}`}
                  {" · "}
                  {bounty.participantCount} joined
                  {" · "}
                  {bounty.taskType}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Creator:{" "}
                  <span className="font-medium text-foreground">
                    {bounty.creatorUsername?.trim() || shortenAddress(bounty.creatorWallet, 4)}
                  </span>
                  <span className="ml-1 font-mono">{shortenAddress(bounty.creatorWallet, 4)}</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="secondary">{bounty.status}</Badge>
                  {bounty.isFeatured && <Badge>Featured</Badge>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={loading}
                  onClick={() => void patchBounty(bounty.id, { isFeatured: !bounty.isFeatured })}
                >
                  {bounty.isFeatured ? "Unfeature" : "Feature"}
                </Button>
                {(["ACTIVE", "ENDED", "COMPLETED", "CANCELLED"] as const).map((status) => (
                  <Button
                    key={status}
                    type="button"
                    size="sm"
                    variant={bounty.status === status ? "default" : "outline"}
                    disabled={loading || bounty.status === status}
                    onClick={() => void patchBounty(bounty.id, { status })}
                  >
                    {status}
                  </Button>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={loading}
                  onClick={() => void removeBounty(bounty.id)}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {creatorOptions.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label>View leaderboard</Label>
              <select
                value={leaderboardWallet}
                onChange={(e) => setLeaderboardWallet(e.target.value)}
                className="flex h-10 min-w-[280px] rounded-md border border-input bg-background px-3 text-sm font-mono"
              >
                {creatorOptions.map((wallet) => (
                  <option key={wallet} value={wallet}>
                    {wallet}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {leaderboardWallet && (
            <BountyXpLeaderboard
              creatorWallet={leaderboardWallet}
              description="Combined XP rankings for all quests from the selected creator."
            />
          )}
        </div>
      )}
    </div>
  );
}
