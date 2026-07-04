"use client";

import { useCallback, useEffect, useState } from "react";
import { NETWORK_PASSPHRASE } from "../lib/stellar";

const SHORT_TIMEOUT_MS = 3000;

function withTimeout<T>(p: Promise<T>, fallback: T, ms = SHORT_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/** True if the user is on an iOS or Android mobile device. */
function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

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

export function useWallet(): WalletState {
  const [status, setStatus] = useState<WalletStatus>("idle");
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [installed, setInstalled] = useState(false);

  // On mount, quickly check for existing Freighter session.
  // Don't block the UI — if nothing is found, stay "idle".
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const freighter = await import("@stellar/freighter-api");
        const mobile = isMobileDevice();

        if (!mobile) {
          const conn = await withTimeout(freighter.isConnected(), {
            isConnected: false,
          }, 1500); // shorter timeout for initial check
          if (cancelled) return;
          if (!conn.isConnected) {
            setInstalled(false);
            return; // stay idle
          }
          setInstalled(true);
        } else {
          setInstalled(true); // assume installed on mobile
        }

        // Try restoring session — but don't hang the UI.
        const addr = await withTimeout(freighter.getAddress(), {
          address: "",
        }, 2000);
        if (cancelled) return;

        if (addr.address) {
          setPublicKey(addr.address);
          const net = await withTimeout(freighter.getNetwork(), {
            network: "",
            networkPassphrase: "",
          }, 2000);
          if (!cancelled) {
            setNetwork(net.network || net.networkPassphrase || null);
            setStatus("ready");
          }
        }
        // else stay idle
      } catch {
        // Silently stay idle — user will tap Connect when ready.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    setStatus("checking");
    try {
      const freighter = await import("@stellar/freighter-api");
      const mobile = isMobileDevice();

      // On desktop: verify extension is installed first.
      if (!mobile) {
        const conn = await withTimeout(freighter.isConnected(), {
          isConnected: false,
        });
        if (!conn.isConnected) {
          throw new Error(
            "Freighter not detected. Install the Freighter browser extension from freighter.app and reload.",
          );
        }
        setInstalled(true);
      }

      // requestAccess() works for both platforms:
      // - Desktop: triggers the Freighter extension popup
      // - Mobile: opens the Freighter app via WalletConnect deep link
      const access = await freighter.requestAccess();
      if (access.error) throw new Error(access.error);
      if (!access.address) {
        throw new Error(
          mobile
            ? "No address returned. Make sure the Freighter app is installed on your phone and try again."
            : "No address returned — did you approve the request?",
        );
      }
      setPublicKey(access.address);
      const net = await withTimeout(freighter.getNetwork(), {
        network: "",
        networkPassphrase: "",
      });
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
      if (!publicKey) throw new Error("Wallet not connected");
      const freighter = await import("@stellar/freighter-api");
      const signed = await freighter.signTransaction(xdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
        address: publicKey,
      });
      if (signed.error) {
        throw new Error(
          typeof signed.error === "string" ? signed.error : "Signing rejected",
        );
      }
      return signed.signedTxXdr;
    },
    [publicKey],
  );

  return { status, publicKey, network, error, installed, connect, disconnect, sign };
}
