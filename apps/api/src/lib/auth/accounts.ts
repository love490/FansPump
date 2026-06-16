import type { OAuthProvider } from "./oauth";
import prisma from "../prisma";

export async function findOrCreateAccountFromOAuth(
  provider: OAuthProvider,
  profile: {
    providerUserId: string;
    email: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  }
) {
  const existingIdentity = await prisma.appIdentity.findUnique({
    where: {
      provider_providerUserId: {
        provider,
        providerUserId: profile.providerUserId,
      },
    },
    include: { account: true },
  });

  if (existingIdentity) {
    const account = await prisma.appAccount.update({
      where: { id: existingIdentity.accountId },
      data: {
        email: existingIdentity.account.email ?? profile.email ?? undefined,
        displayName: profile.displayName ?? existingIdentity.account.displayName ?? undefined,
        avatarUrl: profile.avatarUrl ?? existingIdentity.account.avatarUrl ?? undefined,
      },
    });
    return account;
  }

  if (profile.email) {
    const byEmail = await prisma.appAccount.findUnique({ where: { email: profile.email } });
    if (byEmail) {
      await prisma.appIdentity.create({
        data: {
          accountId: byEmail.id,
          provider,
          providerUserId: profile.providerUserId,
          email: profile.email,
        },
      });
      return prisma.appAccount.update({
        where: { id: byEmail.id },
        data: {
          displayName: profile.displayName ?? byEmail.displayName ?? undefined,
          avatarUrl: profile.avatarUrl ?? byEmail.avatarUrl ?? undefined,
        },
      });
    }
  }

  return prisma.appAccount.create({
    data: {
      email: profile.email,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      identities: {
        create: {
          provider,
          providerUserId: profile.providerUserId,
          email: profile.email,
        },
      },
    },
  });
}

export async function findOrCreateAccountFromEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const existing = await prisma.appAccount.findUnique({ where: { email: normalized } });
  if (existing) return existing;

  return prisma.appAccount.create({
    data: {
      email: normalized,
      identities: {
        create: {
          provider: "email",
          providerUserId: normalized,
          email: normalized,
        },
      },
    },
  });
}

export async function linkWalletToAccount(accountId: string, walletAddress: string) {
  const wallet = walletAddress.toLowerCase();

  const taken = await prisma.appAccount.findFirst({
    where: {
      walletAddress: wallet,
      NOT: { id: accountId },
    },
    select: { id: true },
  });
  if (taken) {
    throw new Error("Wallet is already linked to another account");
  }

  const account = await prisma.appAccount.update({
    where: { id: accountId },
    data: { walletAddress: wallet },
  });

  await prisma.user.upsert({
    where: { walletAddress: wallet },
    create: { walletAddress: wallet },
    update: {},
  });

  return account;
}
