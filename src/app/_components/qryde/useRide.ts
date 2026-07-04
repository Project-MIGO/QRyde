"use client";

// useRide - owns the ride state machine and ties together the GPS, motion,
// and Stellar payment layers. Page components just call into it.

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQryde } from "../QrydeProvider";
import { useGeolocation } from "./useGeolocation";
import { useAccelerometer } from "./useAccelerometer";
import {
  computeFare,
  parseQrydeLink,
  randomHex,
  type DriverInfo,
  type RideReceipt,
  type RideState,
} from "./types";
import { DEMO_DRIVER } from "./demo";
import {
  PaymentError,
  PaymentRejectedError,
  PaymentTimeoutError,
  submitPayment,
} from "./stellarService";

export function useRide() {
  const router = useRouter();
  const ctx = useQryde();
  const geo = useGeolocation();
  const motion = useAccelerometer();

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      geo.stop();
      motion.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = useCallback(() => {
    geo.reset();
    motion.reset();
    ctx.setDriver(null);
    ctx.setScanError(null);
    ctx.setRideState("IDLE");
    router.push("/");
  }, [ctx, geo, motion, router]);

  const startScanEntry = useCallback(() => {
    ctx.setScanError(null);
    ctx.setRideState("SCANNING_ENTRY");
    router.push("/ride");
  }, [ctx, router]);

  const startScanExit = useCallback(() => {
    ctx.setScanError(null);
    ctx.setRideState("SCANNING_EXIT");
  }, [ctx]);

  const backToRide = useCallback(() => {
    ctx.setScanError(null);
    ctx.setRideState("RIDING");
  }, [ctx]);

  const dismissCollision = useCallback(() => motion.clearCollision(), [motion]);

  const requestMotion = useCallback(() => motion.requestPermission(), [motion]);

  const handleEntryDecoded = useCallback(
    (raw: string) => {
      const parsed = parseQrydeLink(raw);
      if (!parsed || parsed.mode !== "entry") {
        ctx.setScanError("That is not a valid QRyde Entry QR code.");
        return;
      }
      ctx.setScanError(null);
      ctx.setDriver(parsed.driver);
      geo.begin();
      motion.start();
      ctx.setRideState("RIDING");
    },
    [ctx, geo, motion],
  );

  const handleExitDecoded = useCallback(
    async (raw: string): Promise<RideReceipt | null> => {
      const parsed = parseQrydeLink(raw);
      if (!parsed || parsed.mode !== "exit") {
        ctx.setScanError("That is not a valid Exit QR code.");
        return null;
      }
      const activeDriver: DriverInfo = ctx.driver ?? parsed.driver;
      if (
        ctx.driver &&
        parsed.driver.driverPublicKey !== ctx.driver.driverPublicKey
      ) {
        ctx.setScanError(
          "This Exit QR belongs to a different driver than your boarding QR.",
        );
        return null;
      }
      ctx.setScanError(null);

      // Freeze ride metrics.
      geo.stop();
      motion.stop();
      const finalDistance = geo.distanceKm;
      const fare = computeFare(finalDistance);

      ctx.setRideState("PAYING");

      let txHash = "";
      let gasXlm = 0.00001;
      const completedAt = Date.now();

      try {
        if (ctx.wallet.publicKey && !ctx.demoMode) {
          const result = await submitPayment(
            ctx.wallet.publicKey,
            activeDriver,
            fare,
            ctx.wallet.sign,
          );
          txHash = result.txHash;
          gasXlm = result.gasXlm;
        } else {
          // Demo / unconnected fallback: emulate the same shape with a fake hash.
          await new Promise((r) => setTimeout(r, 1800));
          txHash = `${randomHex(6)}...${randomHex(6)}`;
          gasXlm = 0.00001;
        }
      } catch (err) {
        const message =
          err instanceof PaymentRejectedError
            ? "Payment was rejected in your wallet."
            : err instanceof PaymentTimeoutError
              ? err.message
              : err instanceof PaymentError
                ? err.message
                : "Payment failed. Please try scanning the Exit QR again.";
        ctx.setScanError(message);
        geo.begin();
        motion.start();
        ctx.setRideState("RIDING");
        return null;
      }

      const receipt: RideReceipt = {
        distanceKm: finalDistance,
        farePhpc: fare,
        gasXlm,
        txHash,
        driver: activeDriver,
        completedAt,
      };
      ctx.appendHistory({
        id: randomHex(8),
        distanceKm: finalDistance,
        farePhpc: fare,
        gasXlm,
        txHash,
        driver: activeDriver,
        completedAt,
        fromLabel: "Pickup point",
        toLabel: "Drop-off",
      });
      ctx.refreshBalances();
      ctx.setRideState("SUCCESS");
      return receipt;
    },
    [ctx, geo, motion],
  );

  return {
    rideState: ctx.rideState,
    driver: ctx.driver,
    scanError: ctx.scanError,
    geo,
    motion,
    reset,
    startScanEntry,
    startScanExit,
    backToRide,
    handleEntryDecoded,
    handleExitDecoded,
    dismissCollision,
    requestMotion,
  };
}

export { DEMO_DRIVER };
export type { RideState, DriverInfo };
