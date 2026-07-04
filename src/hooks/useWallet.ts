"use client";

import { useCallback, useEffect, useState } from "react";
import { NETWORK_PASSPHRASE } from "../lib/stellar";

const TIMEOUT_MS = 3000;

function withTimeout<T>(p: Promise<T>, fallback: T, ms = TIMEOUT_MS): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
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

  // On mount, check if Freighter is installed and whether we already have a
  // granted session. `getAddress` returns "" until the user has approved.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const freighter = await withTimeout(import("@stellar/freighter-api"), {
          isConnected: false,
        } as { isConnected: boolean });
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
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Wallet check failed");
        setStatus("error");
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
      const freighter = await withTimeout(import("@stellar/freighter-api"), {
        isConnected: false,
      } as { isConnected: boolean });
      const conn = await withTimeout(freighter.isConnected(), {
        isConnected: false,
      });
      if (!conn.isConnected) {
        throw new Error(
          "Freighter not detected. Install it from freighter.app and reload.",
        );
      }
      setInstalled(true);
      const access = await freighter.requestAccess();
      if (access.error) throw new Error(access.error);
      if (!access.address) {
        throw new Error("No address returned - did you approve the request?");
      }
      setPublicKey(access.address);
      const net = await withTimeout(freighter.getNetwork(), {
        network: "",
        networkPassphrase: "",
      });
      setNetwork(net.network || net.networkPassphrase || null);
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect wallet");
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
