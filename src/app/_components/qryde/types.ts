// Core domain types for QRyde

export type RideState =
  | "IDLE"
  | "SCANNING_ENTRY"
  | "RIDING"
  | "SCANNING_EXIT"
  | "PAYING"
  | "SUCCESS";

export type AppScreen = "home" | "history" | "profile" | "driver" | "topup";

export interface DriverInfo {
  /** Stellar public key of the driver's wallet */
  driverPublicKey: string;
  /** Physical plate number of the tricycle */
  vehicle: string;
  /** Optional display name for the driver (shown in UI). */
  displayName?: string;
}

export interface GeoPoint {
  lat: number;
  lng: number;
  timestamp: number;
}

export interface RideReceipt {
  distanceKm: number;
  /** Fare in PHP (display currency). */
  farePhpc: number;
  gasXlm: number;
  txHash: string;
  driver: DriverInfo;
  completedAt: number;
  /** Amount actually sent on-chain (e.g. 1.3293 XLM or 17.00 PHPC). Optional for back-compat with old history. */
  sentAmount?: number;
  /** Asset code of the on-chain payment ("XLM" or "PHPC"). */
  sentAsset?: string;
  /** XLM/PHP rate used at the time of the payment. */
  xlmPhpRate?: number;
}

/** Persisted ride history entry (also used for in-memory history). */
export interface RideHistoryItem extends RideReceipt {
  id: string;
  /** Short summary for the history list. */
  fromLabel: string;
  toLabel: string;
}

/** Fare rules: ₱15.00 base + ₱2.00 per kilometer (display units, not stroops). */
export const FARE_BASE = 15.0;
export const FARE_PER_KM = 2.0;

export function computeFare(distanceKm: number): number {
  return FARE_BASE + FARE_PER_KM * distanceKm;
}

/** Deep link scheme parsing: qryde:entry?driver=KEY&vehicle=PLATE */
export type ScanMode = "entry" | "exit";

export interface ParsedScan {
  mode: ScanMode;
  driver: DriverInfo;
}

export function parseQrydeLink(raw: string): ParsedScan | null {
  const trimmed = raw.trim();
  const match = /^qryde:(entry|exit)\?(.*)$/i.exec(trimmed);
  if (!match) return null;

  const mode = match[1].toLowerCase() as ScanMode;
  const params = new URLSearchParams(match[2]);
  const driver = params.get("driver");
  const vehicle = params.get("vehicle");
  const name = params.get("name") ?? undefined;

  if (!driver || !vehicle) return null;

  return {
    mode,
    driver: { driverPublicKey: driver, vehicle, displayName: name },
  };
}

/** Encode a driver entry/exit QR payload. */
export function buildQrydeLink(
  mode: ScanMode,
  driver: DriverInfo,
): string {
  const params = new URLSearchParams({
    driver: driver.driverPublicKey,
    vehicle: driver.vehicle,
  });
  if (driver.displayName) params.set("name", driver.displayName);
  return `qryde:${mode}?${params.toString()}`;
}

/** Shorten a Stellar public key / hash for display: GDWM...9sK2 */
export function truncateKey(key: string, head = 4, tail = 4): string {
  if (key.length <= head + tail + 3) return key;
  return `${key.slice(0, head)}...${key.slice(-tail)}`;
}

export const peso = (n: number): string =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Lightweight, dependency-free random hex string. */
export function randomHex(length: number): string {
  const chars = "0123456789abcdef";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}
