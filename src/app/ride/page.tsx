"use client";

import { PhoneShell } from "../_components/layout/PhoneShell";
import { RideFlow } from "../_components/qryde/RideFlow";

export default function RidePage() {
  return (
    <PhoneShell title="QRyde" showNav={false}>
      <RideFlow />
    </PhoneShell>
  );
}
