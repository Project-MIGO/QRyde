"use client";

// Shared demo driver used to fabricate QR payloads for the simulate-scan flow.
// The address is a real, funded testnet account so the "settle on-chain" path
// in the SDK is exercised against a real destination.

import type { DriverInfo } from "./types";

export const DEMO_DRIVER: DriverInfo = {
  driverPublicKey: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  vehicle: "NCR 8823",
  displayName: "Mang Joey",
};
