"use client";

import { useEffect, useMemo, useState } from "react";
import { useSignMessage } from "wagmi";
import { useActiveWallet } from "@/hooks/useActiveWallet";
import { apiUrl, readApiJson } from "@/lib/api";
import { formatContractError } from "@/lib/contract-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { BOUNTY_REWARD_TYPES, type BountyListItem } from "@/lib/bounties";
import { BountyTaskPicker } from "@/components/bounties/bounty-task-picker";
import {
  parseBountyTaskConfig,
  syncSocialTaskSteps,
  validateBountyTaskSelection,
  type BountyTaskStep,
  type SocialBountyActionId,
} from "@/lib/bounty-task-config";
import {
  defaultQuizDraft,
  quizDraftHasContent,
  quizDraftToPayload,
  validateQuizDraft,
  type QuizDraft,
} from "@/lib/quiz";

type QuestEditDialogProps = {
  bounty: BountyListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (bounty: BountyListItem) => void;
};

/** `datetime-local` needs `YYYY-MM-DDTHH:mm` in the viewer's timezone. */
function toLocalDateTimeInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function QuestEditDialog({ bounty, open, onOpenChange, onSaved }: QuestEditDialogProps) {
  const { walletAddress } = useActiveWallet();
  const { signMessageAsync } = useSignMessage();

  const config = useMemo(() => parseBountyTaskConfig(bounty.verificationConfig), [bounty]);
  const hasQuiz = bounty.verificationMethod === "QUIZ" || Boolean(config.quizXpPoints);

  const [title, setTitle] = useState(bounty.title);
  const [description, setDescription] = useState(bounty.description);
  const [requirements, setRequirements] = useState(bounty.requirements ?? "");
  const [socialActions, setSocialActions] = useState<SocialBountyActionId[]>(
    config.socialActions ?? []
  );
  const [taskSteps, setTaskSteps] = useState<BountyTaskStep[]>(config.taskSteps ?? []);
  const [quizXpPoints, setQuizXpPoints] = useState(
    config.quizXpPoints ? String(config.quizXpPoints) : ""
  );
  const [rewardType, setRewardType] = useState(bounty.rewardType);
  const [rewardAmount, setRewardAmount] = useState(bounty.rewardAmount);
  const [rewardDescription, setRewardDescription] = useState(bounty.rewardDescription ?? "");
  const [maxParticipants, setMaxParticipants] = useState(
    bounty.maxParticipants ? String(bounty.maxParticipants) : ""
  );
  const [endsAt, setEndsAt] = useState(toLocalDateTimeInput(bounty.endsAt));
  const [status, setStatus] = useState<"ACTIVE" | "ENDED" | "CANCELLED">(
    bounty.status === "ACTIVE" ? "ACTIVE" : bounty.status === "CANCELLED" ? "CANCELLED" : "ENDED"
  );
  const [replaceQuiz, setReplaceQuiz] = useState(false);
  const [quizDraft, setQuizDraft] = useState<QuizDraft>(defaultQuizDraft());

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(bounty.title);
    setDescription(bounty.description);
    setRequirements(bounty.requirements ?? "");
    setSocialActions(config.socialActions ?? []);
    setTaskSteps(config.taskSteps ?? []);
    setQuizXpPoints(config.quizXpPoints ? String(config.quizXpPoints) : "");
    setRewardType(bounty.rewardType);
    setRewardAmount(bounty.rewardAmount);
    setRewardDescription(bounty.rewardDescription ?? "");
    setMaxParticipants(bounty.maxParticipants ? String(bounty.maxParticipants) : "");
    setEndsAt(toLocalDateTimeInput(bounty.endsAt));
    setStatus(
      bounty.status === "ACTIVE" ? "ACTIVE" : bounty.status === "CANCELLED" ? "CANCELLED" : "ENDED"
    );
    setReplaceQuiz(false);
    setQuizDraft(defaultQuizDraft());
    setError(null);
  }, [open, bounty, config]);

  function handleSocialActionsChange(next: SocialBountyActionId[]) {
    setSocialActions(next);
    setTaskSteps((steps) => syncSocialTaskSteps(next, steps));
  }

  async function handleSave() {
    if (!walletAddress) {
      setError("Connect your creator wallet to save changes");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (title.trim().length < 3) throw new Error("Title must be at least 3 characters");
      if (description.trim().length < 10) {
        throw new Error("Description must be at least 10 characters");
      }

      const quizIncluded = replaceQuiz && quizDraftHasContent(quizDraft);
      const taskError = validateBountyTaskSelection(socialActions, taskSteps, {
        hasQuiz: quizIncluded || hasQuiz,
      });
      if (taskError) throw new Error(taskError);

      if (quizIncluded) {
        const quizError = validateQuizDraft(quizDraft);
        if (quizError) throw new Error(quizError);
      }

      if (quizIncluded || hasQuiz) {
        const parsedQuizXp = Number(quizXpPoints);
        if (!Number.isInteger(parsedQuizXp) || parsedQuizXp < 1 || parsedQuizXp > 10000) {
          throw new Error("Set quiz XP points (1–10,000)");
        }
      }

      let parsedMaxParticipants: number | null = null;
      if (maxParticipants.trim()) {
        parsedMaxParticipants = Number(maxParticipants);
        if (
          !Number.isInteger(parsedMaxParticipants) ||
          parsedMaxParticipants < 1 ||
          parsedMaxParticipants > 10000
        ) {
          throw new Error("Max participants must be between 1 and 10000, or leave empty");
        }
      }

      let endsAtIso: string | null = null;
      if (endsAt.trim()) {
        const parsedDate = new Date(endsAt);
        if (Number.isNaN(parsedDate.getTime())) throw new Error("Invalid end date");
        endsAtIso = parsedDate.toISOString();
      }

      const prefix =
        process.env.NEXT_PUBLIC_CREATOR_ACTION_MESSAGE_PREFIX ?? "FansPump Creator Action";
      const message = `${prefix}\nEdit quest: ${bounty.id}\nWallet: ${walletAddress}\nTime: ${Date.now()}`;
      const signature = await signMessageAsync({ message });

      const res = await fetch(apiUrl(`/api/bounties/${bounty.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          message,
          signature,
          title: title.trim(),
          description: description.trim(),
          requirements: requirements.trim() || null,
          rewardType,
          rewardAmount: rewardAmount.trim() || "0",
          rewardDescription:
            rewardType === "TOKEN"
              ? rewardDescription.trim().toUpperCase() || null
              : rewardType === "CUSTOM"
                ? rewardDescription.trim() || null
                : null,
          maxParticipants: parsedMaxParticipants,
          endsAt: endsAtIso,
          status,
          socialActions,
          verificationConfig: { ...config, taskSteps },
          quizXpPoints: quizIncluded || hasQuiz ? Number(quizXpPoints) : undefined,
          quiz: quizIncluded ? quizDraftToPayload(quizDraft) : undefined,
        }),
      });

      const { ok, data, error: apiError } = await readApiJson<{ bounty: BountyListItem }>(res);
      if (!ok) throw new Error(apiError ?? "Failed to update quest");

      onSaved(data.bounty);
      onOpenChange(false);
    } catch (e) {
      setError(formatContractError(e instanceof Error ? e.message : "Failed to update quest"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit quest</DialogTitle>
          <DialogDescription>
            Fix task wording, links, XP, dates, or rewards. Participants see updates immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="edit-quest-title">Title</Label>
            <Input
              id="edit-quest-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-quest-description">Description</Label>
            <textarea
              id="edit-quest-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-quest-requirements">Requirements (optional)</Label>
            <textarea
              id="edit-quest-requirements"
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <BountyTaskPicker
            socialActions={socialActions}
            taskSteps={taskSteps}
            quiz={quizDraft}
            quizXpPoints={quizXpPoints}
            onSocialActionsChange={handleSocialActionsChange}
            onTaskStepsChange={setTaskSteps}
            onQuizChange={setQuizDraft}
            onQuizXpPointsChange={setQuizXpPoints}
            showQuiz={replaceQuiz}
          />

          <div className="space-y-2 rounded-lg border border-dashed p-3">
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-input"
                checked={replaceQuiz}
                onChange={(e) => setReplaceQuiz(e.target.checked)}
              />
              <span>
                <span className="font-medium">Replace quiz questions</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {hasQuiz
                    ? "Writes a new question set for this quest and clears previous quiz attempts."
                    : "Adds a quiz to this quest."}
                </span>
              </span>
            </label>
          </div>

          {hasQuiz && !replaceQuiz && (
            <div className="space-y-2">
              <Label htmlFor="edit-quest-quiz-xp">Quiz XP points</Label>
              <Input
                id="edit-quest-quiz-xp"
                type="number"
                min={1}
                max={10000}
                value={quizXpPoints}
                onChange={(e) => setQuizXpPoints(e.target.value)}
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-quest-max">Max participants</Label>
              <Input
                id="edit-quest-max"
                type="number"
                min={1}
                max={10000}
                placeholder="Leave empty for unlimited"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-quest-ends">End date</Label>
              <Input
                id="edit-quest-ends"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Quests end automatically at this time. Leave empty to keep it open until you end it.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-quest-status">Status</Label>
              <select
                id="edit-quest-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="ACTIVE">Active</option>
                <option value="ENDED">Ended</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-quest-reward-type">On-chain bonus</Label>
              <select
                id="edit-quest-reward-type"
                value={rewardType}
                onChange={(e) => setRewardType(e.target.value as typeof rewardType)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {BOUNTY_REWARD_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {rewardType !== "XP" && (
              <div className="space-y-2">
                <Label htmlFor="edit-quest-reward-amount">Bonus amount</Label>
                <Input
                  id="edit-quest-reward-amount"
                  value={rewardAmount}
                  onChange={(e) => setRewardAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
            )}

            {(rewardType === "TOKEN" || rewardType === "CUSTOM") && (
              <div className="space-y-2">
                <Label htmlFor="edit-quest-reward-description">
                  {rewardType === "TOKEN" ? "Token symbol" : "Reward description"}
                </Label>
                <Input
                  id="edit-quest-reward-description"
                  value={rewardDescription}
                  onChange={(e) => setRewardDescription(e.target.value)}
                  placeholder={rewardType === "TOKEN" ? "WIF" : "Merch pack"}
                />
              </div>
            )}
          </div>

          {error && (
            <DismissibleAlert variant="error" onDismiss={() => setError(null)}>
              {error}
            </DismissibleAlert>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={() => void handleSave()}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
