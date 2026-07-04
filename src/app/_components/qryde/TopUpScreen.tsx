"use client";

import { useRouter } from "next/navigation";
import { FiArrowLeft, FiCheckCircle, FiDroplet } from "react-icons/fi";
import { useQryde } from "../QrydeProvider";
import { Button } from "./Button";
import { Card } from "./Card";
import { fundTestnetAccount } from "@/lib/stellar";
import { useState } from "react";

export function TopUpScreen() {
  const router = useRouter();
  const { wallet, refreshBalances } = useQryde();
  const [funding, setFunding] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!wallet.publicKey) {
    return (
      <div className="topup">
        <button
          type="button"
          className="topup__back"
          onClick={() => router.push("/")}
        >
          <FiArrowLeft /> Back
        </button>
        <Card>
          <p className="profile__about">
            Connect your wallet to top up testnet XLM via Friendbot.
          </p>
        </Card>
      </div>
    );
  }

  const handleFund = async () => {
    if (!wallet.publicKey) return;
    setError(null);
    setFunding(true);
    try {
      await fundTestnetAccount(wallet.publicKey);
      await refreshBalances();
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Funding failed");
    } finally {
      setFunding(false);
    }
  };

  return (
    <div className="topup">
      <button
        type="button"
        className="topup__back"
        onClick={() => router.push("/")}
      >
        <FiArrowLeft /> Back
      </button>

      <Card>
        <div className="card__title">Your testnet account</div>
        <div className="topup__key">{wallet.publicKey}</div>

        {!done ? (
          <div style={{ marginTop: 16 }}>
            <Button variant="primary" onClick={handleFund} disabled={funding}>
              {funding ? "Funding..." : "Fund with Friendbot"}
            </Button>
          </div>
        ) : (
          <div className="topup__success" style={{ marginTop: 16 }}>
            <FiCheckCircle /> Funded! Balances will refresh shortly.
          </div>
        )}

        {error && (
          <div className="notice notice--warning" style={{ marginTop: 12 }}>
            <FiDroplet className="notice__icon" />
            <div style={{ flex: 1 }}>
              <div className="notice__title">Funding failed</div>
              <div className="notice__body">{error}</div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
