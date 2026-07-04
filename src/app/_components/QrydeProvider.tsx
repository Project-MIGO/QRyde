"use client";

// Shared client state for QRyde:
// - Wallet connection (Freighter)
// - Wallet balances (Horizon refresh)
// - Ride flow state (IDLE -> SCANNING_ENTRY -> RIDING -> SCANNING_EXIT -> PAYING -> SUCCESS)
// - Ride history (persisted to localStorage)

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useWallet } from "@/hooks/useWallet";
import { useBalances } from "@/hooks/useBalances";
import { useXlmPhpRate } from "@/hooks/useXlmPhpRate";
import type { DriverInfo, RideHistoryItem, RideState } from "@/app/_components/qryde/types";

const HISTORY_KEY = "qryde:history";

function loadHistory(): RideHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RideHistoryItem[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(items: RideHistoryItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

interface QrydeContextValue {
  wallet: ReturnType<typeof useWallet>;
  balances: ReturnType<typeof useBalances>;
  balanceKey: number;
  refreshBalances: () => Promise<void>;

  /** Live XLM/PHP rate. */
  xlmPhpRate: number;
  /** True when the rate came from the hardcoded fallback. */
  xlmPhpRateStale: boolean;

  rideState: RideState;
  setRideState: (s: RideState) => void;
  driver: DriverInfo | null;
  setDriver: (d: DriverInfo | null) => void;
  scanError: string | null;
  setScanError: (m: string | null) => void;

  history: RideHistoryItem[];
  appendHistory: (item: RideHistoryItem) => void;

  demoMode: boolean;
  setDemoMode: (v: boolean) => void;
}

const QrydeContext = createContext<QrydeContextValue | null>(null);

export function QrydeProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet();
  const [balanceKey, setBalanceKey] = useState(0);
  const balances = useBalances(wallet.publicKey, balanceKey);
  const xlmRate = useXlmPhpRate();

  const [rideState, setRideState] = useState<RideState>("IDLE");
  const [driver, setDriver] = useState<DriverInfo | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [history, setHistory] = useState<RideHistoryItem[]>(() => loadHistory());
  const [demoMode, setDemoMode] = useState(false);

  const appendHistory = useCallback((item: RideHistoryItem) => {
    setHistory((h) => {
      const next = [item, ...h].slice(0, 50);
      saveHistory(next);
      return next;
    });
  }, []);

  // (No extra effect needed: useBalances auto-refreshes on publicKey change,
  // and refreshBalances() bumps balanceKey to force a re-fetch.)

  const refreshBalances = useCallback(async () => {
    setBalanceKey((k) => k + 1);
    await balances.refresh();
  }, [balances]);

  const value = useMemo<QrydeContextValue>(
    () => ({
      wallet,
      balances,
      balanceKey,
      refreshBalances,
      xlmPhpRate: xlmRate.rate,
      xlmPhpRateStale: xlmRate.stale,
      rideState,
      setRideState,
      driver,
      setDriver,
      scanError,
      setScanError,
      history,
      appendHistory,
      demoMode,
      setDemoMode,
    }),
    [wallet, balances, balanceKey, refreshBalances, xlmRate.rate, xlmRate.stale, rideState, driver, scanError, history, appendHistory, demoMode],
  );

  return <QrydeContext.Provider value={value}>{children}</QrydeContext.Provider>;
}

export function useQryde(): QrydeContextValue {
  const ctx = useContext(QrydeContext);
  if (!ctx) throw new Error("useQryde must be used inside QrydeProvider");
  return ctx;
}
