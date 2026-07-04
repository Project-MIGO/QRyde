"use client";

import { PhoneShell } from "../_components/layout/PhoneShell";
import { DriverScreen } from "../_components/qryde/DriverScreen";

export default function DriverPage() {
  return (
    <PhoneShell title="Driver view" showNav>
      <DriverScreen />
    </PhoneShell>
  );
}
