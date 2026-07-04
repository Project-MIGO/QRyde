"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchBalances, type Balances } from "../lib/balances";

export interface UseBalancesResult {
  balances: Balances | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useBalances(
  publicKey: string | null,
  refreshKey = 0,
): UseBalancesResult {
  const [balances, setBalances] = useState<Balances | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!publicKey) {
      setBalances(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const b = await fetchBalances(publicKey);
      setBalances(b);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load balances");
      setBalances(null);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    refresh();
  }, [refresh, refreshKey]);

  return { balances, loading, error, refresh };
}
