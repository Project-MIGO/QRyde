"use client";

import { FiUser, FiTrendingUp, FiNavigation, FiPocket } from "react-icons/fi";
import { useQryde } from "../QrydeProvider";
import { Button } from "./Button";
import { Card } from "./Card";
import { Pill } from "./Pill";
import { truncateKey, peso } from "./types";
import { PHPC_DISPLAY_CODE } from "@/lib/stellar";

export function ProfileScreen() {
  const { wallet, balances, history } = useQryde();

  const totalRides = history.length;
  const totalDistance = history.reduce((acc, r) => acc + r.distanceKm, 0);
  const totalSpent = history.reduce((acc, r) => acc + r.farePhpc, 0);

  if (!wallet.publicKey) {
    return (
      <div className="profile">
        <Card>
          <div className="profile__about">
            <strong>Connect a wallet to see your profile.</strong>
            <span>Your lifetime stats, account, and settings live here.</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="profile">
      <Card>
        <div className="profile__account">
          <div className="profile__avatar">
            <FiUser />
          </div>
          <div>
            <div className="profile__name">Commuter</div>
            <div className="profile__pkey">
              {truncateKey(wallet.publicKey, 6, 6)}
            </div>
            <div className="profile__pills">
              <Pill tone="indigo">{wallet.network || "Test SDF"}</Pill>
              {balances.balances && !balances.balances.funded && (
                <Pill tone="warning">Unfunded</Pill>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="home__stats">
        <div className="home__stat">
          <div className="home__stat-label">
            <FiTrendingUp /> Rides
          </div>
          <div className="home__stat-value">{totalRides}</div>
        </div>
        <div className="home__stat">
          <div className="home__stat-label">
            <FiNavigation /> Distance
          </div>
          <div className="home__stat-value">{totalDistance.toFixed(1)} km</div>
        </div>
        <div className="home__stat">
          <div className="home__stat-label">
            <FiPocket /> Spent
          </div>
          <div className="home__stat-value">{peso(totalSpent)}</div>
        </div>
      </div>

      <Card>
        <div className="card__title">Account</div>
        <div className="card__row">
          <span className="card__label">Network</span>
          <span className="card__value">{wallet.network || "Test SDF"}</span>
        </div>
        <div className="card__row">
          <span className="card__label">Public key</span>
          <span className="card__value card__value--mono">
            {truncateKey(wallet.publicKey, 6, 6)}
          </span>
        </div>
        <div className="card__row">
          <span className="card__label">XLM balance</span>
          <span className="card__value card__value--mono">
            {balances.balances?.xlm ?? "0.00"}
          </span>
        </div>
        <div className="card__row">
          <span className="card__label">{PHPC_DISPLAY_CODE} balance</span>
          <span className="card__value card__value--mono">
            {balances.balances?.custom ?? "0.00"}
          </span>
        </div>
      </Card>

      <Card>
        <div className="card__title">About</div>
        <p className="card__subtitle">A demo MVP for StellarX PH.</p>
        <div className="profile__about">
          <span>
            QRyde lets passengers pay tricycle fares in stablecoins settled on
            the Stellar network. Drivers only need a printed QR board - no
            smartphone, no app, no middleman.
          </span>
          <span>
            Built for the MVP: Entry QR → GPS + crash detect → Exit QR → signed
            Stellar payment. Live crash detection uses the device accelerometer;
            distance uses the Geolocation API with a simulated fallback.
          </span>
        </div>
      </Card>

      <Button variant="outline" size="md" onClick={wallet.disconnect}>
        Disconnect wallet
      </Button>
    </div>
  );
}
