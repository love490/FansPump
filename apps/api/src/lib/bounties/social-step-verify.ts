import type { BountyTaskStep } from "@/lib/bounty-task-config";
import { verifyDiscordMember, verifyXFollow } from "@/lib/verification/social-verify";
import prisma from "@/lib/prisma";
import { decryptToken } from "@/lib/verification/oauth-service";

export type SocialStepVerifyResult = {
  verified: boolean;
  reason: string | null;
};

function parseXProfileUsername(linkUrl: string): string | null {
  try {
    const url = new URL(linkUrl);
    const host = url.hostname.replace(/^www\./, "");
    if (host !== "x.com" && host !== "twitter.com") return null;
    const segment = url.pathname.split("/").filter(Boolean)[0];
    if (!segment || ["home", "search", "i", "intent"].includes(segment.toLowerCase())) return null;
    if (segment.toLowerCase() === "status") return null;
    return segment.replace(/^@/, "");
  } catch {
    return null;
  }
}

function parseXTweetId(linkUrl: string): string | null {
  try {
    const url = new URL(linkUrl);
    const match = url.pathname.match(/\/status\/(\d+)/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function parseDiscordInviteCode(linkUrl: string): string | null {
  try {
    const url = new URL(linkUrl);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "invite" && parts[1]) return parts[1];
    if (parts.length === 1) return parts[0];
    return null;
  } catch {
    return null;
  }
}

async function resolveDiscordGuildId(inviteCode: string): Promise<string | null> {
  const res = await fetch(`https://discord.com/api/v10/invites/${encodeURIComponent(inviteCode)}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { guild?: { id?: string } };
  return data.guild?.id ?? null;
}

async function loadXAccess(walletAddress: string) {
  const wallet = walletAddress.toLowerCase();
  const record = await prisma.walletVerification.findUnique({
    where: { walletAddress: wallet },
    select: { xConnected: true, xAccessToken: true, xUserId: true },
  });
  if (!record?.xConnected || !record.xAccessToken || !record.xUserId) {
    return null;
  }
  return {
    accessToken: decryptToken(record.xAccessToken),
    userId: record.xUserId,
  };
}

async function resolveXUserId(username: string, accessToken: string): Promise<string | null> {
  const res = await fetch(
    `https://api.twitter.com/2/users/by/username/${encodeURIComponent(username)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { data?: { id?: string } };
  return data.data?.id ?? null;
}

async function userLikedTweet(
  userId: string,
  tweetId: string,
  accessToken: string
): Promise<boolean> {
  let paginationToken: string | undefined;
  for (let page = 0; page < 5; page++) {
    const params = new URLSearchParams({ max_results: "100" });
    if (paginationToken) params.set("pagination_token", paginationToken);
    const res = await fetch(`https://api.twitter.com/2/users/${userId}/liked_tweets?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      data?: Array<{ id: string }>;
      meta?: { next_token?: string };
    };
    if (data.data?.some((tweet) => tweet.id === tweetId)) return true;
    paginationToken = data.meta?.next_token;
    if (!paginationToken) break;
  }
  return false;
}

async function userRepliedToTweet(
  userId: string,
  tweetId: string,
  accessToken: string
): Promise<boolean> {
  const res = await fetch(
    `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(
      `conversation_id:${tweetId} author_id:${userId}`
    )}&max_results=10`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return false;
  const data = (await res.json()) as { data?: Array<{ id: string }> };
  return (data.data?.length ?? 0) > 0;
}

async function userQuotedTweet(
  userId: string,
  tweetId: string,
  accessToken: string
): Promise<boolean> {
  let paginationToken: string | undefined;
  for (let page = 0; page < 3; page++) {
    const params = new URLSearchParams({
      max_results: "25",
      "tweet.fields": "referenced_tweets",
    });
    if (paginationToken) params.set("pagination_token", paginationToken);
    const res = await fetch(`https://api.twitter.com/2/users/${userId}/tweets?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      data?: Array<{ referenced_tweets?: Array<{ type: string; id: string }> }>;
      meta?: { next_token?: string };
    };
    const quoted = data.data?.some((tweet) =>
      tweet.referenced_tweets?.some((ref) => ref.type === "quoted" && ref.id === tweetId)
    );
    if (quoted) return true;
    paginationToken = data.meta?.next_token;
    if (!paginationToken) break;
  }
  return false;
}

export async function verifySocialBountyStep(
  walletAddress: string,
  step: BountyTaskStep
): Promise<SocialStepVerifyResult> {
  if (step.kind !== "social" || !step.actionId) {
    return { verified: true, reason: null };
  }

  const link = step.linkUrl?.trim();
  if (!link) {
    return { verified: false, reason: "Quest step is missing a link" };
  }

  switch (step.actionId) {
    case "X_FOLLOW": {
      const username = parseXProfileUsername(link);
      if (!username) {
        return { verified: false, reason: "Invalid X profile link for follow task" };
      }
      const xAuth = await loadXAccess(walletAddress);
      if (!xAuth) {
        return { verified: false, reason: "Connect your X account in Settings before claiming" };
      }
      const targetUserId = await resolveXUserId(username, xAuth.accessToken);
      if (!targetUserId) {
        return { verified: false, reason: "Could not resolve X account from quest link" };
      }
      return verifyXFollow(walletAddress, targetUserId);
    }
    case "X_LIKE": {
      const tweetId = parseXTweetId(link);
      if (!tweetId) {
        return { verified: false, reason: "Invalid X post link for like task" };
      }
      const xAuth = await loadXAccess(walletAddress);
      if (!xAuth) {
        return { verified: false, reason: "Connect your X account in Settings before claiming" };
      }
      const liked = await userLikedTweet(xAuth.userId, tweetId, xAuth.accessToken);
      return liked
        ? { verified: true, reason: null }
        : { verified: false, reason: "Like not detected — like the post on X, then try again" };
    }
    case "X_COMMENT": {
      const tweetId = parseXTweetId(link);
      if (!tweetId) {
        return { verified: false, reason: "Invalid X post link for comment task" };
      }
      const xAuth = await loadXAccess(walletAddress);
      if (!xAuth) {
        return { verified: false, reason: "Connect your X account in Settings before claiming" };
      }
      const replied = await userRepliedToTweet(xAuth.userId, tweetId, xAuth.accessToken);
      return replied
        ? { verified: true, reason: null }
        : { verified: false, reason: "Comment not detected — reply on X, then try again" };
    }
    case "X_QUOTE": {
      const tweetId = parseXTweetId(link);
      if (!tweetId) {
        return { verified: false, reason: "Invalid X post link for quote task" };
      }
      const xAuth = await loadXAccess(walletAddress);
      if (!xAuth) {
        return { verified: false, reason: "Connect your X account in Settings before claiming" };
      }
      const quoted = await userQuotedTweet(xAuth.userId, tweetId, xAuth.accessToken);
      return quoted
        ? { verified: true, reason: null }
        : { verified: false, reason: "Quote post not detected — quote on X, then try again" };
    }
    case "DISCORD_JOIN": {
      const inviteCode = parseDiscordInviteCode(link);
      if (!inviteCode) {
        return { verified: false, reason: "Invalid Discord invite link" };
      }
      const guildId = await resolveDiscordGuildId(inviteCode);
      if (!guildId) {
        return { verified: false, reason: "Could not resolve Discord server from invite link" };
      }
      return verifyDiscordMember(walletAddress, guildId);
    }
    case "TELEGRAM_JOIN":
      return {
        verified: false,
        reason: "Telegram join cannot be verified automatically yet — use a custom task or manual review",
      };
    default:
      return { verified: false, reason: "Unsupported social task" };
  }
}
