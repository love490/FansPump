"use client";

import { useEffect, useState } from "react";

export type UserProfile = {
  username: string | null;
  profileImageUrl: string | null;
};

export function useUserProfile(walletAddress: string | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!walletAddress) {
      setProfile(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/user/profile?wallet=${walletAddress.toLowerCase()}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setProfile({
          username: data.profile?.username ?? null,
          profileImageUrl: data.profile?.profileImageUrl ?? null,
        });
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  return { profile, loading };
}
