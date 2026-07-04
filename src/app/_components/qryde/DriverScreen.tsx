"use client";

import { useRouter } from "next/navigation";
import { FiArrowLeft, FiUser } from "react-icons/fi";
import { useState } from "react";
import { DriverQrCard } from "./DriverQrCard";
import { DEMO_DRIVER } from "./demo";
import { Card } from "./Card";
import { IconBubble } from "./IconBubble";
import { Pill } from "./Pill";
import { truncateKey } from "./types";

export function DriverScreen() {
  const router = useRouter();
  const [mode] = useState<"entry" | "exit">("entry");

  return (
    <div className="driver-screen">
      <button
        type="button"
        className="driver-screen__back"
        onClick={() => router.push("/")}
      >
        <FiArrowLeft /> Back
      </button>

      <div className="card__header">
        <div>
          <div className="card__title">Driver QR codes</div>
          <div className="card__subtitle">
            What the printed QR board on a tricycle looks like.
          </div>
        </div>
      </div>

      <Card>
        <div className="profile__account">
          <IconBubble tone="indigo">
            <FiUser />
          </IconBubble>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="profile__name">
              {DEMO_DRIVER.displayName ??
                `Driver ${truncateKey(DEMO_DRIVER.driverPublicKey)}`}
            </div>
            <div className="profile__pkey">
              Vehicle {DEMO_DRIVER.vehicle} ·{" "}
              {truncateKey(DEMO_DRIVER.driverPublicKey, 4, 4)}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="driver-screen__qr-block">
          <Pill tone="accent">Entry QR</Pill>
          <DriverQrCard driver={DEMO_DRIVER} mode="entry" />
          <p className="driver-screen__hint">
            Passenger scans this when boarding.
          </p>
        </div>

        <div className="card__divider" />

        <div className="driver-screen__qr-block">
          <Pill tone="indigo">Exit QR</Pill>
          <DriverQrCard driver={DEMO_DRIVER} mode="exit" />
          <p className="driver-screen__hint">
            Passenger scans this on arrival to settle the fare.
          </p>
        </div>
      </Card>

      <Card>
        <div className="card__title">Why two QRs?</div>
        <p className="driver-screen__why">
          The Entry QR starts the ride and the app begins tracking distance and
          motion. The Exit QR stops the trip, computes the fare, and submits a
          single signed Stellar payment from passenger to driver - all without
          the driver needing a phone.
        </p>
        <p className="card__subtitle" style={{ marginTop: 8 }}>
          Showing <span className="mono">{mode}</span> preview
        </p>
      </Card>
    </div>
  );
}
