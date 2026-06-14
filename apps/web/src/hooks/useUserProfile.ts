"use client";

import { useCallback, useEffect, useState } from "react";
import { PROFILE_UPDATED_EVENT } from "@/lib/profile/profile-events";

export type UserProfile = {
  username: string | null;
  profileImageUrl: string | null;
};

export function useUserProfile(walletAddress: string | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!walletAddress) {
      setProfile(null);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/user/profile?wallet=${walletAddress.toLowerCase()}`);
      const data = await res.json();
      setProfile({
        username: data.profile?.username ?? null,
        profileImageUrl: data.profile?.profileImageUrl ?? null,
      });
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    function onProfileUpdated(event: Event) {
      const detail = (event as CustomEvent<UserProfile>).detail;
      if (!detail) return;
      setProfile(detail);
    }

    window.addEventListener(PROFILE_UPDATED_EVENT, onProfileUpdated);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, onProfileUpdated);
  }, []);

  const setProfileLocal = useCallback((next: UserProfile) => {
    setProfile(next);
  }, []);

  return { profile, loading, refetch, setProfileLocal };
}
