"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FiAlertTriangle,
  FiArrowRight,
  FiCheck,
  FiCopy,
  FiDroplet,
  FiLink,
  FiNavigation,
  FiRefreshCw,
} from "react-icons/fi";
import { useQryde } from "../QrydeProvider";
import { Button } from "./Button";
import { Card } from "./Card";
import { IconBubble } from "./IconBubble";
import { Pill } from "./Pill";
import { PHPC_DISPLAY_CODE, PHPC_HAS_TRUSTLINE } from "@/lib/stellar";
import { truncateKey } from "./types";
import { useRide } from "./useRide";

export function HomeScreen() {
  const ctx = useQryde();
  const router = useRouter();
  const ride = useRide();
  const [copyDone, setCopyDone] = useState(false);

  const balances = ctx.balances.balances;
  const publicKey = ctx.wallet.publicKey ?? "";
  const heroAmount = balances
    ? (PHPC_HAS_TRUSTLINE ? balances.custom : balances.xlm)
    : "-";
  const showFundedBanner = balances && !balances.funded;
  const showTrustlineBanner =
    balances && balances.funded && PHPC_HAS_TRUSTLINE && !balances.hasTrustline;

  const totalRides = ctx.history.length;
  const totalDistance = ctx.history.reduce((acc, r) => acc + r.distanceKm, 0);
  const totalSpent = ctx.history.reduce((acc, r) => acc + r.farePhpc, 0);

  const copyAddr = async () => {
    if (!publicKey) return;
    try {
      await navigator.clipboard.writeText(publicKey);
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const handleAddTrustline = async () => {
    if (!publicKey) return;
    try {
      const { buildAddTrustlineXDR, submitSignedXDR, pollTransaction } = await import(
        "@/lib/payment"
      );
      const xdr = await buildAddTrustlineXDR(publicKey);
      const signed = await ctx.wallet.sign(xdr);
      const hash = await submitSignedXDR(signed);
      await pollTransaction(hash);
      ctx.refreshBalances();
    } catch (e) {
      ctx.setScanError(
        e instanceof Error ? e.message : "Failed to add trustline",
      );
    }
  };

  return (
    <div className="home">
      <div className="wallet-hero">
        <span className="wallet-hero__decor wallet-hero__decor--tl" />
        <span className="wallet-hero__decor wallet-hero__decor--bl" />

        <div className="wallet-hero__relative">
          <div className="wallet-hero__bar">
            <span className="wallet-hero__bar-label">
              <span>Wallet balance</span>
            </span>
            <button
              type="button"
              className={`wallet-hero__refresh${ctx.balances.loading ? " wallet-hero__refresh--loading" : ""}`}
              onClick={() => ctx.balances.refresh()}
              title="Refresh balances"
              aria-label="Refresh balances"
            >
              <FiRefreshCw />
            </button>
          </div>

          <div className="wallet-hero__amount">
            <span className="wallet-hero__amount-value">{heroAmount}</span>
            <span className="wallet-hero__amount-code">
              {PHPC_DISPLAY_CODE}
            </span>
          </div>

          {PHPC_HAS_TRUSTLINE && (
            <div className="wallet-hero__pills">
              <Pill tone="accent" pulseDot>
                {balances?.xlm ?? "0.00"} XLM for gas
              </Pill>
              <Pill tone="invert">{ctx.wallet.network || "Testnet"}</Pill>
            </div>
          )}

          {publicKey && (
            <button
              type="button"
              onClick={copyAddr}
              className="wallet-hero__copy"
              title="Copy public key"
            >
              {copyDone ? <FiCheck /> : <FiCopy />}
              {truncateKey(publicKey, 5, 5)}
            </button>
          )}
        </div>
      </div>

      {showFundedBanner && (
        <div className="notice notice--warning">
          <FiDroplet className="notice__icon" />
          <div style={{ flex: 1 }}>
            <div className="notice__title">Account not funded</div>
            <div className="notice__body">
              You need testnet XLM to pay for gas. Top up with Friendbot to get
              started.
            </div>
          </div>
        </div>
      )}

      {showTrustlineBanner && (
        <div className="notice notice--indigo">
          <FiLink className="notice__icon" />
          <div style={{ flex: 1 }}>
            <div className="notice__title">
              Add a {PHPC_DISPLAY_CODE} trustline
            </div>
            <div className="notice__body">
              You need a trustline to the {PHPC_DISPLAY_CODE} issuer before you
              can hold and pay with it.
            </div>
            <div className="notice__action">
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddTrustline}
                disabled={ctx.balances.loading}
              >
                Add {PHPC_DISPLAY_CODE} trustline
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="home__stats">
        <div className="home__stat">
          <div className="home__stat-label">Rides</div>
          <div className="home__stat-value">{totalRides}</div>
        </div>
        <div className="home__stat">
          <div className="home__stat-label">Distance</div>
          <div className="home__stat-value">{totalDistance.toFixed(1)} km</div>
        </div>
        <div className="home__stat">
          <div className="home__stat-label">Spent</div>
          <div className="home__stat-value">
            ₱{totalSpent.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <Button
        variant="accent"
        onClick={ride.startScanEntry}
        disabled={ctx.balances.loading}
      >
        <FiNavigation /> Start commute (scan entry QR)
      </Button>

      <Button variant="outline" size="md" onClick={() => router.push("/topup")}>
        <FiArrowRight /> Top up testnet XLM
      </Button>

      <Card>
        <div className="card__header">
          <div>
            <div className="card__title">How a ride works</div>
            <div className="card__subtitle">
              Three taps from street to settled fare.
            </div>
          </div>
        </div>
        <ol className="home__how-list">
          <li className="home__how-item">
            <span className="home__how-num">1</span>
            <span>Scan the driver&apos;s printed Entry QR to start the trip.</span>
          </li>
          <li className="home__how-item">
            <span className="home__how-num">2</span>
            <span>
              The app tracks distance and watches the accelerometer for crashes.
            </span>
          </li>
          <li className="home__how-item">
            <span className="home__how-num">3</span>
            <span>
              Scan the Exit QR at your destination - the fare settles on-chain.
            </span>
          </li>
        </ol>
      </Card>
    </div>
  );
}
