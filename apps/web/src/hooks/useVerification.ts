"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api";
import type { VerificationStatus } from "@/lib/verification/types";

const EMPTY_SOCIALS = {
  x: { connected: false },
  discord: { connected: false },
} as const;

async function fetchVerificationStatus(address: string): Promise<VerificationStatus> {
  const res = await fetch(apiUrl(`/api/verification/status/${address.toLowerCase()}`));
  if (!res.ok) throw new Error("Failed to load verification status");
  return res.json() as Promise<VerificationStatus>;
}

export function verificationQueryKey(address: string | undefined) {
  return ["verification", address?.toLowerCase()] as const;
}

export function useVerification(address: string | undefined) {
  const queryClient = useQueryClient();
  const normalized = address?.toLowerCase();

  const { data, error, isLoading } = useQuery({
    queryKey: verificationQueryKey(normalized),
    queryFn: () => fetchVerificationStatus(normalized!),
    enabled: Boolean(normalized),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  async function refresh() {
    if (!normalized) return;
    await queryClient.invalidateQueries({ queryKey: verificationQueryKey(normalized) });
  }

  return {
    status: data,
    level: data?.level ?? "NONE",
    emailVerified: data?.emailVerified ?? false,
    neoIdVerified: data?.neoIdVerified ?? false,
    socials: data?.socials ?? EMPTY_SOCIALS,
    isLoading,
    isError: Boolean(error),
    refresh,
  };
}
