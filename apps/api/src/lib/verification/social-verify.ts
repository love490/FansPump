import prisma from "../prisma";
import { decryptToken } from "./oauth-service";

export async function verifyXFollow(
  walletAddress: string,
  targetUserId: string
): Promise<{ verified: boolean; reason: string | null }> {
  const wallet = walletAddress.toLowerCase();
  const record = await prisma.walletVerification.findUnique({
    where: { walletAddress: wallet },
    select: { xConnected: true, xAccessToken: true, xUserId: true },
  });

  if (!record?.xConnected || !record.xAccessToken || !record.xUserId) {
    return { verified: false, reason: "X account not connected" };
  }

  const accessToken = decryptToken(record.xAccessToken);
  const res = await fetch(
    `https://api.twitter.com/2/users/${record.xUserId}/following?user.fields=id&max_results=1000`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = (await res.json()) as { data?: Array<{ id: string }> };
  const isFollowing = data.data?.some((u) => u.id === targetUserId) ?? false;

  return {
    verified: isFollowing,
    reason: isFollowing ? null : "Not following target account",
  };
}

export async function verifyDiscordMember(
  walletAddress: string,
  guildId: string
): Promise<{ verified: boolean; reason: string | null }> {
  const wallet = walletAddress.toLowerCase();
  const record = await prisma.walletVerification.findUnique({
    where: { walletAddress: wallet },
    select: { discordConnected: true, discordAccessToken: true },
  });

  if (!record?.discordConnected || !record.discordAccessToken) {
    return { verified: false, reason: "Discord account not connected" };
  }

  const accessToken = decryptToken(record.discordAccessToken);
  const res = await fetch("https://discord.com/api/users/@me/guilds", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const guilds = (await res.json()) as Array<{ id: string }>;
  const isMember = Array.isArray(guilds) && guilds.some((g) => g.id === guildId);

  return {
    verified: isMember,
    reason: isMember ? null : "Not a member of the server",
  };
}
