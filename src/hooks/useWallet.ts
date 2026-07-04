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
  const [status, setStatus] = useState<WalletStatus>("checking");
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [installed, setInstalled] = useState(false);

  // On mount, check for existing Freighter session.
  // On mobile, Freighter uses WalletConnect — isConnected() returns false
  // even when a session is possible, so we handle mobile differently.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const freighter = await import("@stellar/freighter-api");
        const mobile = isMobileDevice();

        if (!mobile) {
          // Desktop: check for Freighter browser extension.
          const conn = await withTimeout(freighter.isConnected(), {
            isConnected: false,
          });
          if (cancelled) return;
          if (!conn.isConnected) {
            setInstalled(false);
            setStatus("idle");
            return;
          }
          setInstalled(true);
        } else {
          // Mobile: we can't detect the Freighter app beforehand.
          // Mark as installed so the UI is ready to connect.
          setInstalled(true);
        }

        // Try restoring an existing session.
        const addr = await withTimeout(freighter.getAddress(), {
          address: "",
        });
        if (cancelled) return;

        if (addr.address) {
          setPublicKey(addr.address);
          const net = await withTimeout(freighter.getNetwork(), {
            network: "",
            networkPassphrase: "",
          });
          if (!cancelled) {
            setNetwork(net.network || net.networkPassphrase || null);
            setStatus("ready");
          }
        } else {
          setStatus("idle");
        }
      } catch {
        if (!cancelled) {
          // On mobile, errors during initial check are expected.
          // Don't show them — let the user tap "Connect".
          if (isMobileDevice()) {
            setInstalled(true);
            setStatus("idle");
          } else {
            setStatus("idle");
          }
        }
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
