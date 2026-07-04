"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiCheckCircle,
  FiExternalLink,
  FiMapPin,
  FiNavigation,
  FiPlay,
  FiUser,
  FiWifi,
  FiZap,
  FiActivity,
} from "react-icons/fi";
import { useQryde } from "../QrydeProvider";
import { useRide } from "./useRide";
import { Button } from "./Button";
import { Card } from "./Card";
import { IconBubble } from "./IconBubble";
import { Pill } from "./Pill";
import { QrScanner } from "./QrScanner";
import {
  buildQrydeLink,
  computeFare,
  peso,
  truncateKey,
  type RideReceipt,
} from "./types";
import { DEMO_DRIVER } from "./demo";
import { explorerTxUrl, PHPC_DISPLAY_CODE, PHPC_HAS_TRUSTLINE } from "@/lib/stellar";
import { phpToXlm } from "@/lib/price";

const ENTRY_LINK = buildQrydeLink("entry", DEMO_DRIVER);
const EXIT_LINK = buildQrydeLink("exit", DEMO_DRIVER);

export function RideFlow() {
  const ride = useRide();
  const { rideState, driver, scanError, geo, motion } = ride;
  const router = useRouter();

  useEffect(() => {
    if (rideState === "IDLE") {
      router.push("/");
    }
  }, [rideState, router]);

  if (rideState === "SCANNING_ENTRY") {
    return (
      <ScanScreen
        mode="entry"
        onCancel={() => ride.reset()}
        onDecoded={ride.handleEntryDecoded}
        simulatedValue={ENTRY_LINK}
        error={scanError}
      />
    );
  }

  if (rideState === "SCANNING_EXIT") {
    return (
      <ScanScreen
        mode="exit"
        onCancel={() => ride.backToRide()}
        onDecoded={async (raw) => {
          await ride.handleExitDecoded(raw);
        }}
        simulatedValue={EXIT_LINK}
        error={scanError}
      />
    );
  }

  if (rideState === "RIDING" && driver) {
    return (
      <RidingPanel
        driver={driver}
        distanceKm={geo.distanceKm}
        speedKph={geo.speedKph}
        gForce={motion.gForce}
        gpsActive={geo.current !== null}
        motionActive={motion.active}
        motionPermission={motion.permission}
        collision={motion.collision}
        onAllowMotion={ride.requestMotion}
        onDismissCollision={ride.dismissCollision}
        onArrive={ride.startScanExit}
      />
    );
  }

  if (rideState === "PAYING") {
    return <PayingPanel />;
  }

  if (rideState === "SUCCESS") {
    return <SuccessPanel onDone={ride.reset} />;
  }

  return null;
}

// --------- sub-screens below ---------

function ScanScreen({
  mode,
  onCancel,
  onDecoded,
  simulatedValue,
  error,
}: {
  mode: "entry" | "exit";
  onCancel: () => void;
  onDecoded: (raw: string) => void;
  simulatedValue: string;
  error: string | null;
}) {
  const isEntry = mode === "entry";
  return (
    <div className="scan-screen">
      <button type="button" className="scan-screen__back" onClick={onCancel}>
        <FiArrowLeft /> Back
      </button>

      <div className="scan-screen__title-row">
        <div className="scan-screen__icon">
          <FiNavigation />
        </div>
        <h2 className="scan-screen__title">
          Scan {isEntry ? "Entry" : "Exit"} QR
        </h2>
        <p className="scan-screen__body">
          Align with the tricycle&apos;s printed {isEntry ? "Entry" : "Exit"} QR
          code
        </p>
      </div>

      <QrScanner onDecoded={onDecoded} simulatedValue={simulatedValue} />

      {error && (
        <div className="scan-screen__error">
          <FiAlertTriangle /> {error}
        </div>
      )}
    </div>
  );
}

function RidingPanel({
  driver,
  distanceKm,
  speedKph,
  gForce,
  gpsActive,
  motionActive,
  motionPermission,
  collision,
  onAllowMotion,
  onDismissCollision,
  onArrive,
}: {
  driver: import("./types").DriverInfo;
  distanceKm: number;
  speedKph: number;
  gForce: number;
  gpsActive: boolean;
  motionActive: boolean;
  motionPermission: import("./useAccelerometer").MotionPermission;
  collision: boolean;
  onAllowMotion: () => void;
  onDismissCollision: () => void;
  onArrive: () => void;
}) {
  const { xlmPhpRate } = useQryde();
  const farePhp = computeFare(distanceKm);
  const fareLabel = peso(farePhp);
  const onChainAmount = PHPC_HAS_TRUSTLINE
    ? farePhp
    : phpToXlm(farePhp, xlmPhpRate);
  const onChainLabel = `${onChainAmount.toFixed(
    PHPC_HAS_TRUSTLINE ? 2 : 4,
  )} ${PHPC_DISPLAY_CODE}`;
  const needsMotion =
    motionPermission === "prompt" || motionPermission === "denied";

  return (
    <div className="ride">
      {collision && (
        <div className="collision-banner">
          <FiAlertTriangle className="collision-banner__icon" />
          <div>
            <div className="collision-banner__title">
              Possible collision detected
            </div>
            <p className="collision-banner__body">
              A sudden impact over 4G was sensed. Are you okay? Tap dismiss if
              this was a false alarm.
            </p>
            <div className="collision-banner__action">
              <button
                type="button"
                className="btn-flat-danger"
                onClick={onDismissCollision}
              >
                I&apos;m okay - dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="ride__pills">
        <Pill tone={gpsActive ? "accent" : "neutral"} pulseDot={gpsActive}>
          <FiWifi /> GPS {gpsActive ? "Active" : "Off"}
        </Pill>
        <Pill tone={motionActive ? "accent" : "neutral"} pulseDot={motionActive}>
          <FiActivity /> Crash {motionActive ? "On" : "Off"}
        </Pill>
      </div>

      {needsMotion && (
        <Card className="ride__allow-motion" padding="sm">
          <span className="ride__allow-motion-text">
            <FiActivity /> Enable crash detection
          </span>
          <button type="button" className="motion-allow" onClick={onAllowMotion}>
            Allow motion
          </button>
        </Card>
      )}

      <div className="metric-grid">
        <div className="metric">
          <div className="metric__label">
            <FiNavigation /> Distance
          </div>
          <div className="metric__value">
            {distanceKm.toFixed(2)} <span className="metric__unit">km</span>
          </div>
        </div>
        <div className="metric">
          <div className="metric__label">
            <FiActivity /> Speed
          </div>
          <div className="metric__value">
            {Math.round(speedKph)} <span className="metric__unit">kph</span>
          </div>
        </div>
        <div className="metric">
          <div className="metric__label">
            <FiZap /> Fare
          </div>
          <div className="metric__value metric__value--accent">{fareLabel}</div>
          {!PHPC_HAS_TRUSTLINE && (
            <div className="metric__sub">≈ {onChainLabel}</div>
          )}
        </div>
      </div>

      <Card padding="sm">
        <div className="ride__fare-breakdown">
          <span>₱15.00 base</span>
          <span>+</span>
          <span>₱2.00 / km</span>
          <span>=</span>
          <span className="ride__fare-breakdown__total">{fareLabel}</span>
        </div>
        {!PHPC_HAS_TRUSTLINE && (
          <div className="ride__fare-conversion">
            Settled on-chain as <strong>{onChainLabel}</strong>{" "}
            <span className="ride__fare-rate">
              (1 XLM ≈ ₱{xlmPhpRate.toFixed(2)})
            </span>
          </div>
        )}
      </Card>

      <Card>
        <div className="card__title" style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <FiActivity /> Live G-force
        </div>
        <div className="gforce-card__bar">
          <div
            className="gforce-card__fill"
            style={{
              width: `${Math.min(100, (gForce / 5) * 100)}%`,
              background: gForce > 4 ? "#ef5350" : "#00bfa5",
            }}
          />
        </div>
        <div className="gforce-card__bar-meta">
          <span>{gForce.toFixed(2)} G</span>
          <span>Alert at 4.0 G</span>
        </div>
      </Card>

      <Card padding="sm">
        <div className="driver-row">
          <IconBubble tone="accent">
            <FiUser />
          </IconBubble>
          <div className="driver-row__main">
            <div className="driver-row__name">
              {driver.displayName ??
                `Driver ${truncateKey(driver.driverPublicKey)}`}
            </div>
            <div className="driver-row__vehicle">
              <FiMapPin /> Vehicle {driver.vehicle}
            </div>
          </div>
          <Pill tone="indigo">On trip</Pill>
        </div>
      </Card>

      <Button variant="accent" onClick={onArrive}>
        <FiPlay /> Arrive at destination (scan exit QR)
      </Button>
    </div>
  );
}

function PayingPanel() {
  return (
    <div className="paying">
      <div className="paying__spinner">
        <span className="paying__spinner-ring" />
        <FiZap className="paying__spinner-icon" />
      </div>
      <div>
        <div className="paying__title">Processing payment</div>
        <p className="paying__body">
          Signing and submitting the transaction to the Stellar ledger…
        </p>
      </div>
    </div>
  );
}

function SuccessPanel({ onDone }: { onDone: () => void }) {
  // We don't have access to the receipt here; it's stored in the RideFlow's
  // last successful run via the history list. Read the most recent entry.
  const { history } = useQryde();
  const last = history[0] as RideReceipt | undefined;
  if (!last) {
    return (
      <div className="success">
        <div className="success__head">
          <div className="success__icon">
            <FiCheckCircle />
          </div>
          <h2 className="success__title">Payment sent!</h2>
          <p className="success__body">Your fare was settled on Stellar.</p>
        </div>
        <Button variant="primary" onClick={onDone}>
          Back to Home
        </Button>
      </div>
    );
  }
  return (
    <div className="success">
      <div className="success__head">
        <div className="success__icon-wrap">
          <span className="success__icon-ring" />
          <div className="success__icon">
            <FiCheckCircle />
          </div>
        </div>
        <h2 className="success__title">Payment sent!</h2>
        <p className="success__body">Your fare was settled on Stellar.</p>
      </div>

      <Card>
        <div className="card__row">
          <span className="card__label">Total distance</span>
          <span className="card__value">{last.distanceKm.toFixed(2)} km</span>
        </div>
        <div className="card__row">
          <span className="card__label">Fare (PHP)</span>
          <span className="card__value card__value--accent">
            {peso(last.farePhpc)}
          </span>
        </div>
        {last.sentAmount !== undefined && (
          <div className="card__row">
            <span className="card__label">Settled on-chain</span>
            <span className="card__value card__value--accent">
              {last.sentAmount.toFixed(
                last.sentAsset === "XLM" ? 4 : 2,
              )} {last.sentAsset ?? PHPC_DISPLAY_CODE}
            </span>
          </div>
        )}
        {!PHPC_HAS_TRUSTLINE && last.xlmPhpRate !== undefined && (
          <div className="card__row">
            <span className="card__label">FX rate used</span>
            <span className="card__value">
              1 XLM ≈ ₱{last.xlmPhpRate.toFixed(2)}
            </span>
          </div>
        )}
        <div className="card__row">
          <span className="card__label">Network gas fee</span>
          <span className="card__value">{last.gasXlm.toFixed(7)} XLM</span>
        </div>
        <div className="card__row">
          <span className="card__label">Driver</span>
          <span className="card__value card__value--mono">
            {truncateKey(last.driver.driverPublicKey, 5, 5)}
          </span>
        </div>
        <div className="card__row">
          <span className="card__label">Vehicle</span>
          <span className="card__value">{last.driver.vehicle}</span>
        </div>
        <div className="card__row">
          <span className="card__label">Tx hash</span>
          <span className="card__value card__value--mono">
            {truncateKey(last.txHash, 6, 6)}
          </span>
        </div>
      </Card>

      <a
        href={explorerTxUrl(last.txHash)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-link"
      >
        View on Stellar Expert <FiExternalLink />
      </a>

      <Button variant="primary" onClick={onDone}>
        Back to Home
      </Button>
    </div>
  );
}
