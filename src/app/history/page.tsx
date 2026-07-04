"use client";

import { PhoneShell } from "../_components/layout/PhoneShell";
import { HistoryScreen } from "../_components/qryde/HistoryScreen";

export default function HistoryPage() {
  return (
    <PhoneShell title="QRyde" showNav>
      <HistoryScreen />
    </PhoneShell>
  );
}
