"use client";

import { useCallback, useEffect, useState } from "react";
import { NETWORK_PASSPHRASE } from "../lib/stellar";

// ---------------------------------------------------------------------------
// Types for the raw Freighter extension API (window.freighter).
// This is what both the desktop extension AND the iOS in-app browser inject.
// We bypass @stellar/freighter-api because its wrapper has compatibility
// issues across platforms.
// ---------------------------------------------------------------------------
interface FreighterGlobal {
  isConnected: () => Promise<{ isConnected: boolean; error?: string }>;
  getAddress: () => Promise<{ address: string; error?: string }>;
  getNetwork: () => Promise<{ network: string; networkPassphrase: string; error?: string }>;
  requestAccess: () => Promise<{ address: string; error?: string }>;
  signTransaction: (
    xdr: string,
    opts?: { networkPassphrase?: string; address?: string },
  ) => Promise<{ signedTxXdr: string; error?: string }>;
}

function getFreighter(): FreighterGlobal | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & { freighter?: FreighterGlobal };
  return w.freighter ?? null;
}

// How long to wait for Freighter to inject itself into the page before
// concluding it isn't installed. The injection happens after window load on
// the Freighter iOS in-app browser and can be late on cold extension starts;
// without this grace period we'd report "not installed" even when present.
const INJECTION_WAIT_MS = 4000;

/**
 * Poll for `window.freighter`. On the iOS in-app browser the global isn't set
 * at mount time, and `getFreighter()` would return null forever — so we wait.
 */
function waitForFreighterInjection(
  cancelled: () => boolean,
): Promise<FreighterGlobal | null> {
  const f = getFreighter();
  if (f) return Promise.resolve(f);
  return new Promise((resolve) => {
    let elapsed = 0;
    const tick = () => {
      if (cancelled()) return resolve(null);
      const found = getFreighter();
      if (found) return resolve(found);
      elapsed += 200;
      if (elapsed >= INJECTION_WAIT_MS) return resolve(null);
      setTimeout(tick, 200);
    };
    tick();
  });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type WalletStatus = "idle" | "checking" | "ready" | "error";

export interface WalletState {
  status: WalletStatus;
  publicKey: string | null;
  network: string | null;
  error: string | null;
  installed: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  sign: (xdr: string) => Promise<string>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useWallet(): WalletState {
  const [status, setStatus] = useState<WalletStatus>("idle");
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [installed, setInstalled] = useState(false);

  // On mount: detect if Freighter is present and try restoring a session.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Wait for Freighter to inject (extension or iOS in-app browser).
      // Without this grace period getFreighter() would race the injection
      // and we'd wrongly tell the user to install Freighter.
      const f = await waitForFreighterInjection(() => cancelled);
      if (cancelled) return;
      if (!f) {
        setInstalled(false);
        return;
      }

      setInstalled(true);

      try {
        // Quick check: is there already an approved session?
        const addr = await f.getAddress();
        if (cancelled) return;

        if (addr.address && !addr.error) {
          setPublicKey(addr.address);
          const net = await f.getNetwork();
          if (!cancelled && !net.error) {
            setNetwork(net.network || net.networkPassphrase || null);
            setStatus("ready");
          }
        }
      } catch {
        // No session yet — that's fine.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Connect: request access from Freighter.
  const connect = useCallback(async () => {
    setError(null);
    setStatus("checking");

    // Give the injection a chance (iOS browser / cold extension start) so we
    // don't wrongly throw "not detected".
    const f = await waitForFreighterInjection(() => false);
    if (!f) {
      setError(
        "Freighter not detected. Install the Freighter extension (desktop) or open this page in the Freighter app browser (iOS/Android).",
      );
      setStatus("error");
      return;
    }

    try {
      const access = await f.requestAccess();
      if (access.error) throw new Error(access.error);
      if (!access.address) {
        throw new Error("No address returned — did you approve the connection?");
      }

      setPublicKey(access.address);
      setInstalled(true);

      const net = await f.getNetwork();
      setNetwork(net.network || net.networkPassphrase || null);
      setStatus("ready");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to connect wallet";
      setError(msg);
      setStatus("error");
    }
  }, []);

  const disconnect = useCallback(() => {
    setPublicKey(null);
    setNetwork(null);
    setError(null);
    setStatus("idle");
  }, []);

  const sign = useCallback(
    async (xdr: string): Promise<string> => {
      const f = getFreighter();
      if (!f) throw new Error("Freighter not available");
      if (!publicKey) throw new Error("Wallet not connected");

      const signed = await f.signTransaction(xdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
        address: publicKey,
      });
      if (signed.error) throw new Error(signed.error);
      return signed.signedTxXdr;
    },
    [publicKey],
  );

  return {
    status,
    publicKey,
    network,
    error,
    installed,
    connect,
    disconnect,
    sign,
  };
}