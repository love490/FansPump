import prisma from "../prisma";
import {
  deriveVerificationLevel,
  maskEmail,
  type VerificationStatus,
} from "./types";

export async function getVerificationStatus(
  walletAddress: string
): Promise<VerificationStatus> {
  const wallet = walletAddress.toLowerCase();
  const record = await prisma.walletVerification.findUnique({
    where: { walletAddress: wallet },
  });

  const emailVerified = record?.emailVerified ?? false;
  const neoIdVerified = record?.neoIdVerified ?? false;

  return {
    walletAddress: wallet,
    level: deriveVerificationLevel(emailVerified, neoIdVerified),
    emailVerified,
    neoIdVerified,
    email: record?.email ? maskEmail(record.email) : undefined,
    socials: {
      x: {
        connected: record?.xConnected ?? false,
        username: record?.xUsername ?? undefined,
      },
      discord: {
        connected: record?.discordConnected ?? false,
        username: record?.discordUsername ?? undefined,
      },
    },
  };
}
