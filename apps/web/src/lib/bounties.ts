export type BountyStatus = "ACTIVE" | "ENDED" | "COMPLETED" | "CANCELLED";
export type BountyTaskType = "SOCIAL" | "CONTENT" | "REFERRAL" | "COMMUNITY" | "CUSTOM";
export type BountyRewardType = "OPN" | "TOKEN" | "XP" | "CUSTOM";

export type BountyTab = "trending" | "active" | "completed" | "ended";

export const BOUNTY_TABS: { id: BountyTab; label: string }[] = [
  { id: "trending", label: "Trending" },
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "ended", label: "Ended" },
];

export const BOUNTY_TASK_TYPES: { id: BountyTaskType; label: string }[] = [
  { id: "SOCIAL", label: "Social" },
  { id: "CONTENT", label: "Content" },
  { id: "REFERRAL", label: "Referral" },
  { id: "COMMUNITY", label: "Community" },
  { id: "CUSTOM", label: "Custom" },
];

export const BOUNTY_REWARD_TYPES: { id: BountyRewardType; label: string }[] = [
  { id: "OPN", label: "OPN" },
  { id: "TOKEN", label: "Project Token" },
  { id: "XP", label: "XP / Points" },
  { id: "CUSTOM", label: "Custom Reward" },
];

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
  maxParticipants: number;
  participantCount: number;
  viewCount: number;
  status: BountyStatus;
  effectiveStatus: "active" | "ended" | "completed";
  startsAt: string;
  endsAt: string | null;
  completedAt: string | null;
  createdAt: string;
  spotsLeft: number;
  isFull: boolean;
};

export function formatBountyReward(
  bounty: Pick<BountyListItem, "rewardType" | "rewardAmount" | "rewardDescription" | "tokenSymbol">
) {
  if (bounty.rewardType === "CUSTOM" && bounty.rewardDescription) {
    return bounty.rewardDescription;
  }
  if (bounty.rewardType === "TOKEN" && bounty.tokenSymbol) {
    return `${bounty.rewardAmount} ${bounty.tokenSymbol}`;
  }
  if (bounty.rewardType === "XP") {
    return `${bounty.rewardAmount} XP`;
  }
  return `${bounty.rewardAmount} ${bounty.rewardType}`;
}
