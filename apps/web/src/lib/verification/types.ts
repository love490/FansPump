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
