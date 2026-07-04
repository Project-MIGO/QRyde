"use client";

import { FiArrowRight, FiDownloadCloud, FiZap, FiShield, FiActivity, FiRadio } from "react-icons/fi";
import { Button } from "./Button";
import { Card } from "./Card";
import { useQryde } from "../QrydeProvider";

export function OnboardingScreen({ onDemo }: { onDemo: () => void }) {
  const { wallet } = useQryde();

  return (
    <div className="onboarding">
      <div className="onboarding__hero">
        <span className="onboarding__item">
          <FiZap /> MVP
        </span>
        <h1 className="onboarding__title">QRyde</h1>
        <p className="onboarding__body">
          QR-based P2P tricycle fares settled on Stellar. No app for the driver.
          No coins for the passenger.
        </p>
      </div>

      <div className="onboarding__feature-grid">
        <Card padding="sm" className="feature-card">
          <div className="feature-card__icon">
            <FiRadio />
          </div>
          <div className="feature-card__title">Entry QR</div>
          <div className="feature-card__body">
            Boarding check-in starts the trip timer and GPS lock.
          </div>
        </Card>
        <Card padding="sm" className="feature-card">
          <div className="feature-card__icon">
            <FiActivity />
          </div>
          <div className="feature-card__title">Crash detect</div>
          <div className="feature-card__body">
            Accelerometer watches for &gt;4G impacts during the ride.
          </div>
        </Card>
        <Card padding="sm" className="feature-card">
          <div className="feature-card__icon">
            <FiZap />
          </div>
          <div className="feature-card__title">Live distance</div>
          <div className="feature-card__body">
            Fare = ₱15 base + ₱2/km, settled on the Exit QR.
          </div>
        </Card>
        <Card padding="sm" className="feature-card">
          <div className="feature-card__icon">
            <FiShield />
          </div>
          <div className="feature-card__title">On-chain</div>
          <div className="feature-card__body">
            Real Stellar payment, real proof, no middleman.
          </div>
        </Card>
      </div>

      {!wallet.installed && (
        <div className="onboarding__install-fail">
          <strong>Freighter not detected</strong>
          Install the Freighter browser extension and switch it to{" "}
          <span style={{ fontFamily: "ui-monospace, monospace" }}>Test Net</span>
          , then reload this page.
          <a href="https://freighter.app" target="_blank" rel="noopener noreferrer">
            <FiDownloadCloud /> Get Freighter
          </a>
        </div>
      )}

      <Button variant="primary" onClick={wallet.connect} disabled={wallet.status === "checking"}>
        {wallet.status === "checking" ? "Checking…" : "Connect Freighter wallet"}
      </Button>
      <Button variant="outline" size="md" onClick={onDemo}>
        View as guest (demo mode)
      </Button>

      <div className="onboarding__footer">
        Built for the StellarX PH workshop · testnet only
      </div>
    </div>
  );
}
