import type { UserProfile } from "@/hooks/useUserProfile";

export const PROFILE_UPDATED_EVENT = "fanspump:profile-updated";

export function dispatchProfileUpdated(profile: UserProfile) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT, { detail: profile }));
}
