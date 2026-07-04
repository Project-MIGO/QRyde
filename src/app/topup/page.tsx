"use client";

import { PhoneShell } from "../_components/layout/PhoneShell";
import { TopUpScreen } from "../_components/qryde/TopUpScreen";

export default function TopUpPage() {
  return (
    <PhoneShell title="QRyde" showNav={false}>
      <TopUpScreen />
    </PhoneShell>
  );
}
