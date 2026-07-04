"use client";

import { PhoneShell } from "./_components/layout/PhoneShell";
import { HomeScreen } from "./_components/qryde/HomeScreen";
import { OnboardingScreen } from "./_components/qryde/OnboardingScreen";
import { useQryde } from "./_components/QrydeProvider";

export default function HomePage() {
  const { wallet, demoMode, setDemoMode } = useQryde();
  const ready = wallet.status === "ready" && !!wallet.publicKey;

  if (!ready && !demoMode) {
    return (
      <PhoneShell title="Welcome" showNav={false}>
        <OnboardingScreen onDemo={() => setDemoMode(true)} />
      </PhoneShell>
    );
  }

  return (
    <PhoneShell title="QRyde" showNav>
      <HomeScreen />
    </PhoneShell>
  );
}
