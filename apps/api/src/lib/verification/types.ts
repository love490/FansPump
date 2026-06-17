export type VerificationLevel = "NONE" | "EMAIL" | "FULL";

export type SocialConnections = {
  x: {
    connected: boolean;
    username?: string;
  };
  discord: {
    connected: boolean;
    username?: string;
  };
};

export type VerificationStatus = {
  walletAddress: string;
  level: VerificationLevel;
  emailVerified: boolean;
  neoIdVerified: boolean;
  email?: string;
  socials: SocialConnections;
};

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  return `${user[0] ?? ""}***@${domain}`;
}

export function deriveVerificationLevel(
  emailVerified: boolean,
  neoIdVerified: boolean
): VerificationLevel {
  if (emailVerified && neoIdVerified) return "FULL";
  if (emailVerified) return "EMAIL";
  return "NONE";
}
