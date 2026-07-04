"use client";

import { useQryde } from "../_components/QrydeProvider";
import { PhoneShell } from "../_components/layout/PhoneShell";
import { RideFlow } from "../_components/qryde/RideFlow";

export default function RidePage() {
  const { rideState } = useQryde();
  const title =
    rideState === "RIDING"
      ? "Trip in progress"
      : rideState === "SCANNING_ENTRY"
        ? "Scan entry QR"
        : rideState === "SCANNING_EXIT"
          ? "Scan exit QR"
          : rideState === "PAYING"
            ? "Settling fare"
            : rideState === "SUCCESS"
              ? "Fare settled"
              : "QRyde";

  return (
    <PhoneShell title={title} showNav={false}>
      <RideFlow />
    </PhoneShell>
  );
}
