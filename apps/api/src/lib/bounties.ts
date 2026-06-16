import type { BountyStatus, BountyRewardType, BountyTaskType, Prisma } from "@iopn/database";

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

export const bountyListInclude = {
  creator: { select: { username: true, profileImageUrl: true } },
  token: { select: { symbol: true, contractAddress: true } },
  _count: { select: { participations: true } },
} satisfies Prisma.BountyInclude;

export function resolveEffectiveStatus(bounty: {
  status: BountyStatus;
  endsAt: Date | null;
}): "active" | "ended" | "completed" {
  if (bounty.status === "COMPLETED") return "completed";
  if (bounty.status === "ENDED" || bounty.status === "CANCELLED") return "ended";
  if (bounty.endsAt && bounty.endsAt.getTime() < Date.now()) return "ended";
  return "active";
}

export function mapBountyRow(
  b: Prisma.BountyGetPayload<{ include: typeof bountyListInclude }>
): BountyListItem {
  const participantCount = b._count.participations;
  const effectiveStatus = resolveEffectiveStatus(b);
  const spotsLeft = Math.max(0, b.maxParticipants - participantCount);

  return {
    id: b.id,
    creatorWallet: b.creatorWallet,
    creatorUsername: b.creator.username,
    creatorProfileImageUrl: b.creator.profileImageUrl,
    tokenAddress: b.tokenAddress,
    tokenSymbol: b.token?.symbol ?? null,
    title: b.title,
    description: b.description,
    taskType: b.taskType,
    requirements: b.requirements,
    rewardType: b.rewardType,
    rewardAmount: b.rewardAmount,
    rewardDescription: b.rewardDescription,
    maxParticipants: b.maxParticipants,
    participantCount,
    viewCount: b.viewCount,
    status: b.status,
    effectiveStatus,
    startsAt: b.startsAt.toISOString(),
    endsAt: b.endsAt?.toISOString() ?? null,
    completedAt: b.completedAt?.toISOString() ?? null,
    createdAt: b.createdAt.toISOString(),
    spotsLeft,
    isFull: spotsLeft <= 0,
  };
}

export function bountyTabWhere(tab: BountyTab, now = new Date()): Prisma.BountyWhereInput {
  switch (tab) {
    case "trending":
      return {
        status: "ACTIVE",
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      };
    case "active":
      return {
        status: "ACTIVE",
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      };
    case "completed":
      return { status: "COMPLETED" };
    case "ended":
      return {
        OR: [
          { status: { in: ["ENDED", "CANCELLED"] } },
          { status: "ACTIVE", endsAt: { lte: now } },
        ],
      };
    default:
      return {};
  }
}

export function bountyTabOrderBy(tab: BountyTab): Prisma.BountyOrderByWithRelationInput[] {
  if (tab === "trending") {
    return [{ participantCount: "desc" }, { viewCount: "desc" }, { createdAt: "desc" }];
  }
  if (tab === "completed") {
    return [{ completedAt: "desc" }, { updatedAt: "desc" }];
  }
  if (tab === "ended") {
    return [{ endsAt: "desc" }, { updatedAt: "desc" }];
  }
  return [{ createdAt: "desc" }];
}

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
