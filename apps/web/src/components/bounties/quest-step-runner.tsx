"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { apiUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { stepButtonLabel, type BountyTaskStep } from "@/lib/bounty-task-config";
import {
  allStepsClaimed,
  parseStepProof,
  QUIZ_STEP_ID,
  resolveQuestSteps,
  stepXpPoints,
  totalQuestXp,
} from "@/lib/bounty-step-progress";
import type { BountyListItem, BountyParticipationView } from "@/lib/bounties";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { cn } from "@/lib/utils";

type QuestStepRunnerProps = {
  bounty: BountyListItem;
  questId: string;
  participation: BountyParticipationView;
  walletAddress: string;
  signAction: (action: string) => Promise<{
    walletAddress: string;
    message: string;
    signature: string;
  }>;
  onUpdate: (participation: BountyParticipationView) => void;
  onRefresh: () => void;
  onError: (message: string) => void;
};

export function QuestStepRunner({
  bounty,
  questId,
  participation,
  walletAddress,
  signAction,
  onUpdate,
  onRefresh,
  onError,
}: QuestStepRunnerProps) {
  const [busy, setBusy] = useState<string | null>(null);

  const steps = useMemo(
    () =>
      resolveQuestSteps({
        taskType: bounty.taskType,
        verificationMethod: bounty.verificationMethod,
        verificationConfig: bounty.verificationConfig,
        xpReward: bounty.xpReward ?? 0,
      }),
    [bounty]
  );

  const proof = parseStepProof(participation.proofJson);
  const xpTotal = totalQuestXp(steps);
  const stepsDone = allStepsClaimed(steps, proof);
  const xpClaimed = (participation.xpAwarded ?? 0) > 0 || Boolean(proof.xpClaimedAt);

  async function postStep(path: string, actionLabel: string) {
    setBusy(path);
    onError("");
    try {
      const auth = await signAction(actionLabel);
      const res = await fetch(apiUrl(`/api/bounties/${questId}${path}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(auth),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.participation) onUpdate(data.participation);
        throw new Error(data.error ?? "Request failed");
      }
      if (data.participation) onUpdate(data.participation);
      return data;
    } catch (e) {
      onError(e instanceof Error ? e.message : "Request failed");
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function handleVisit(step: BountyTaskStep) {
    const link = step.linkUrl?.trim();
    if (link) {
      window.open(link, "_blank", "noopener,noreferrer");
    }
    await postStep(`/steps/${step.id}/visit`, `Visit step: ${step.id}`);
  }

  async function handleClaimStep(step: BountyTaskStep) {
    await postStep(`/steps/${step.id}/claim`, `Claim step: ${step.id}`);
  }

  async function handleClaimXp() {
    await postStep("/claim-xp", `Claim XP: ${questId}`);
  }

  const claimedCount = steps.filter((s) => proof.stepProgress?.[s.id]?.claimedAt).length;

  return (
    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">Quest steps</p>
          <p className="text-xs text-muted-foreground">
            Complete each action, then claim step XP after verification. Collect total XP when all steps pass.
          </p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Sparkles className="h-3 w-3" />
          {xpTotal} XP total
        </Badge>
      </div>

      <ul className="space-y-3">
        {steps.map((step) => (
          <StepRow
            key={step.id}
            step={step}
            entry={proof.stepProgress?.[step.id]}
            busy={busy}
            isQuizStep={step.id === QUIZ_STEP_ID}
            questId={questId}
            walletAddress={walletAddress}
            onQuizComplete={() => onRefresh()}
            onVisit={() => void handleVisit(step)}
            onClaim={() => void handleClaimStep(step)}
          />
        ))}
      </ul>

      <div className="rounded-lg border border-border bg-background p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Progress</p>
            <p className="text-xs text-muted-foreground">
              {claimedCount}/{steps.length} steps claimed
            </p>
          </div>
          {xpClaimed ? (
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              +{participation.xpAwarded ?? xpTotal} XP collected
            </div>
          ) : (
            <Button
              type="button"
              disabled={!stepsDone || busy === "/claim-xp"}
              onClick={() => void handleClaimXp()}
            >
              {busy === "/claim-xp" ? "Claiming…" : `Claim ${xpTotal} XP`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepRow({
  step,
  entry,
  busy,
  isQuizStep,
  questId,
  walletAddress,
  onQuizComplete,
  onVisit,
  onClaim,
}: {
  step: BountyTaskStep;
  entry?: { visitedAt?: string; verifiedAt?: string; verifyError?: string; claimedAt?: string };
  busy: string | null;
  isQuizStep: boolean;
  questId: string;
  walletAddress: string;
  onQuizComplete: () => void;
  onVisit: () => void;
  onClaim: () => void;
}) {
  const [quizProgress, setQuizProgress] = useState<{ current: number; total: number } | null>(null);
  const isSocial = step.kind === "social";
  const label = stepButtonLabel(step);
  const xp = stepXpPoints(step);
  const visited = Boolean(entry?.visitedAt);
  const claimed = Boolean(entry?.claimedAt);
  const verifyError = entry?.verifyError;
  const visitBusy = busy === `/steps/${step.id}/visit`;
  const claimBusy = busy === `/steps/${step.id}/claim`;

  useEffect(() => {
    if (isQuizStep && !claimed && !visited && !visitBusy) {
      onVisit();
    }
  }, [isQuizStep, claimed, visited, visitBusy, onVisit]);

  if (isQuizStep && !claimed) {
    return (
      <li className="rounded-lg border bg-background p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">
            {quizProgress
              ? `Question ${quizProgress.current}/${quizProgress.total}`
              : "Quiz"}
          </p>
          <Badge variant="outline">{xp} XP</Badge>
        </div>
        <QuizRunner
          bountyId={questId}
          walletAddress={walletAddress}
          onClaimReady={onQuizComplete}
          onProgressChange={(current, total) => setQuizProgress({ current, total })}
        />
        {verifyError && <p className="mt-2 text-xs text-red-600">{verifyError}</p>}
      </li>
    );
  }

  return (
    <li
      className={cn(
        "rounded-lg border bg-background p-4",
        claimed && "border-emerald-500/30 bg-emerald-500/5"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{step.instruction.trim() || label}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {claimed
              ? "Step XP claimed"
              : visited
                ? isSocial
                  ? "Action opened — claim to verify and collect points"
                  : "Action completed — claim your points"
                : step.linkUrl?.trim()
                  ? "Tap the button to open the page"
                  : "Tap the button when you've completed this task"}
          </p>
          {verifyError && !claimed && (
            <p className="mt-1 text-xs text-red-600">{verifyError}</p>
          )}
        </div>
        <Badge variant="outline">{xp} XP</Badge>
      </div>

      {!isQuizStep && (
        <div className="mt-3 flex flex-wrap gap-2">
          {claimed ? (
            <Button type="button" size="sm" variant="secondary" disabled>
              <CheckCircle2 className="mr-1 h-4 w-4" /> Claimed
            </Button>
          ) : visited ? (
            <Button type="button" size="sm" disabled={claimBusy} onClick={onClaim}>
              {claimBusy ? "Verifying…" : isSocial ? `Verify & claim ${xp} XP` : `Claim ${xp} XP`}
            </Button>
          ) : (
            <Button type="button" size="sm" disabled={visitBusy} onClick={onVisit}>
              {visitBusy ? "Starting…" : `${label} · ${xp} XP`}
            </Button>
          )}
        </div>
      )}
    </li>
  );
}
