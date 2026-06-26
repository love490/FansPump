import { resolveQuestSteps, totalQuestXp, hasOnchainBonusReward } from "@/lib/bounty-step-progress";

export type BountyStatus = "ACTIVE" | "ENDED" | "COMPLETED" | "CANCELLED";
export type BountyTaskType =
  | "SOCIAL"
  | "ENGAGEMENT"
  | "GROWTH"
  | "CONTENT"
  | "REFERRAL"
  | "COMMUNITY"
  | "CUSTOM";
export type BountyRewardType = "OPN" | "TOKEN" | "XP" | "CUSTOM";
export type BountyVerificationMethod = "MANUAL" | "ONCHAIN" | "API" | "QUIZ";
export type BountyParticipationStatus =
  | "JOINED"
  | "SUBMITTED"
  | "VERIFIED"
  | "REJECTED"
  | "CLAIMED";

export type BountyTab =
  | "trending"
  | "active"
  | "completed"
  | "ended"
  | "featured"
  | "newest"
  | "ending_soon";

export const BOUNTY_TABS: { id: BountyTab; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "trending", label: "Trending" },
  { id: "ending_soon", label: "Ending Soon" },
  { id: "active", label: "Active" },
];

export const BOUNTY_TASK_TYPES: { id: BountyTaskType; label: string }[] = [
  { id: "SOCIAL", label: "Social" },
  { id: "CUSTOM", label: "Custom" },
];

export const BOUNTY_REWARD_TYPES: { id: BountyRewardType; label: string }[] = [
  { id: "OPN", label: "OPN" },
  { id: "TOKEN", label: "Creator Token" },
  { id: "XP", label: "XP / Points" },
  { id: "CUSTOM", label: "Custom Reward" },
];

export const VERIFICATION_METHODS: { id: BountyVerificationMethod; label: string }[] = [
  { id: "MANUAL", label: "Manual review" },
  { id: "ONCHAIN", label: "Automatic on-chain" },
  { id: "QUIZ", label: "Quiz" },
];

export const ONCHAIN_REQUIREMENTS = [
  { id: "HOLD_TOKEN", label: "Hold token" },
  { id: "ADD_LIQUIDITY", label: "Add liquidity" },
  { id: "SWAP", label: "Execute swap" },
  { id: "STAKE", label: "Stake assets" },
] as const;

export type BountyListItem = {
  id: string;
  creatorWallet: string;
  creatorUsername: string | null;
  creatorProfileImageUrl: string | null;
  tokenAddress: string | null;
  tokenSymbol: string | null;
  title: string;
  description: string;
  taskType: BountyTaskType;
  requirements: string | null;
  rewardType: BountyRewardType;
  rewardAmount: string;
  rewardDescription: string | null;
  xpReward?: number;
  verificationMethod: BountyVerificationMethod;
  verificationConfig: unknown | null;
  isFeatured: boolean;
  maxParticipants: number | null;
  participantCount: number;
  viewCount: number;
  status: BountyStatus;
  effectiveStatus: "active" | "ended" | "completed";
  startsAt: string;
  endsAt: string | null;
  completedAt: string | null;
  createdAt: string;
  spotsLeft: number | null;
  isFull: boolean;
  completionCount?: number;
};

export type BountyParticipationView = {
  status: BountyParticipationStatus;
  proofJson: unknown | null;
  verifiedAt: string | null;
  claimedAt: string | null;
  rejectionReason: string | null;
  xpAwarded?: number;
};

export type BountyLeaderboardEntry = {
  rank: number;
  walletAddress: string;
  username: string | null;
  profileImageUrl: string | null;
  totalXp: number;
  questsCompleted: number;
};

export function formatBountyReward(
  bounty: Pick<BountyListItem, "rewardType" | "rewardAmount" | "rewardDescription" | "tokenSymbol" | "xpReward" | "taskType" | "verificationMethod" | "verificationConfig">
) {
  const steps = resolveQuestSteps({
    taskType: bounty.taskType,
    verificationMethod: bounty.verificationMethod,
    verificationConfig: bounty.verificationConfig,
    xpReward: bounty.xpReward ?? 0,
  });
  const xpTotal = totalQuestXp(steps);
  const onchainBonus = hasOnchainBonusReward(bounty.rewardType, bounty.rewardAmount);

  if (onchainBonus) {
    let bonus: string;
    if (bounty.rewardType === "CUSTOM" && bounty.rewardDescription) {
      bonus = bounty.rewardDescription;
    } else if (bounty.rewardType === "TOKEN") {
      const symbol = bounty.tokenSymbol ?? bounty.rewardDescription?.trim();
      bonus = symbol
        ? `${bounty.rewardAmount} ${symbol.toUpperCase()}`
        : `${bounty.rewardAmount} tokens`;
    } else {
      bonus = `${bounty.rewardAmount} ${bounty.rewardType}`;
    }
    return `${xpTotal} XP + ${bonus}`;
  }

  return `${xpTotal} XP`;
}

export function formatBountyParticipantCount(
  participantCount: number,
  maxParticipants: number | null,
  noun: "joined" | "participants" = "joined"
): string {
  if (maxParticipants == null) {
    return `${participantCount} ${noun}`;
  }
  return `${participantCount}/${maxParticipants} ${noun}`;
}

export function participationStatusLabel(status: BountyParticipationStatus): string {
  switch (status) {
    case "JOINED":
      return "Joined";
    case "SUBMITTED":
      return "Pending review";
    case "VERIFIED":
      return "Verified — claim reward";
    case "REJECTED":
      return "Rejected";
    case "CLAIMED":
      return "Reward claimed";
    default:
      return status;
  }
}

export function timeRemaining(endsAt: string | null): string | null {
  if (!endsAt) return null;
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h left`;
  const mins = Math.floor(diff / (1000 * 60));
  return `${mins}m left`;
}
