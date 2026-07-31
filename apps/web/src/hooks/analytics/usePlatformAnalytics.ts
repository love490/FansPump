"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  AnalyticsLaunchSort,
  AnalyticsRange,
  PlatformAnalyticsPayload,
} from "@iopn/shared";
import { apiUrl } from "@/lib/api";

const POLL_MS = 45_000;

export type PlatformAnalyticsFilters = {
  q?: string;
  category?: string;
  verified?: boolean;
  minTrust?: number;
  creator?: string;
};

export function usePlatformAnalytics(
  range: AnalyticsRange,
  launchSort: AnalyticsLaunchSort,
  filters: PlatformAnalyticsFilters = {}
) {
  const [data, setData] = useState<PlatformAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        range,
        launchSort,
      });
      if (filters.q) params.set("q", filters.q);
      if (filters.category) params.set("category", filters.category);
      if (filters.verified) params.set("verified", "true");
      if (filters.minTrust != null) params.set("minTrust", String(filters.minTrust));
      if (filters.creator) params.set("creator", filters.creator);

      const res = await fetch(apiUrl(`/api/analytics/platform?${params}`));
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load analytics");
      setData(json.analytics);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [range, launchSort, filters.q, filters.category, filters.verified, filters.minTrust, filters.creator]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  return { data, loading, error, refresh: load };
}
