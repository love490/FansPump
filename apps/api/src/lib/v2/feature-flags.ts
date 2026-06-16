export type V2FeatureFlags = {
  trustScore: boolean;
  creatorProfiles: boolean;
  creatorQuests: boolean;
  reputationSystem: boolean;
  leaderboards: boolean;
  reputationGraph: boolean;
  lifecycleAnalytics: boolean;
};

function envFlag(key: string, defaultValue = false): boolean {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return defaultValue;
  return raw === "true" || raw === "1";
}

/** Server-side feature flags — env overrides with testnet-friendly defaults. */
export function getV2FeatureFlags(): V2FeatureFlags {
  return {
    trustScore: envFlag("ENABLE_TRUST_SCORE", true),
    creatorProfiles: envFlag("ENABLE_CREATOR_PROFILES", true),
    creatorQuests: envFlag("ENABLE_CREATOR_QUESTS", true),
    reputationSystem: envFlag("ENABLE_REPUTATION_SYSTEM", true),
    leaderboards: envFlag("ENABLE_LEADERBOARDS", true),
    reputationGraph: envFlag("ENABLE_REPUTATION_GRAPH", false),
    lifecycleAnalytics: envFlag("ENABLE_LIFECYCLE_ANALYTICS", false),
  };
}

/** Client-safe subset exposed via API. */
export function getPublicV2FeatureFlags(): V2FeatureFlags {
  return getV2FeatureFlags();
}
