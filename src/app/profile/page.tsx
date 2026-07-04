"use client";

import { PhoneShell } from "../_components/layout/PhoneShell";
import { ProfileScreen } from "../_components/qryde/ProfileScreen";

export default function ProfilePage() {
  return (
    <PhoneShell title="QRyde" showNav>
      <ProfileScreen />
    </PhoneShell>
  );
}
