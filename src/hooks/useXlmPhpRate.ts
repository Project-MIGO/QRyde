"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchXlmToPhpRate, getCachedXlmToPhpRate } from "@/lib/price";

export interface UseXlmPhpRateResult {
  /** XLM to PHP rate (PHP per 1 XLM). */
  rate: number;
  /** True while a fetch is in flight. */
  loading: boolean;
  /** Error message from the last fetch attempt, or null. */
  error: string | null;
  /** True if `rate` came from the fallback rather than a live fetch. */
  stale: boolean;
  /** Force a refresh. */
  refresh: () => Promise<void>;
}

/**
 * React hook for the live XLM/PHP rate.
 * - Initializes synchronously from cache or fallback (so the UI never blocks).
 * - Fetches on mount, then every 5 minutes.
 * - The "stale" flag lets the UI hint that the rate is a fallback.
 */
export function useXlmPhpRate(): UseXlmPhpRateResult {
  const [rate, setRate] = useState<number>(() => getCachedXlmToPhpRate());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchXlmToPhpRate();
      setRate(r);
      // If we got a value and it differs from the hardcoded fallback,
      // we're no longer stale.
      setStale(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch XLM/PHP rate");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [refresh]);

  return { rate, loading, error, stale, refresh };
}
