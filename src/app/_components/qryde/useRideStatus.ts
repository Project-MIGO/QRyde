"use client";

import { useEffect } from "react";
import { useQryde } from "../QrydeProvider";
import { useAccelerometer } from "./useAccelerometer";

/**
 * Listens to the ride state so the header can show a collision ping when
 * the accelerometer fires while the user is in a trip.
 *
 * The ride-flow screen owns its own accelerometer instance for the in-ride
 * collision banner; this hook runs a second, lightweight listener so the
 * persistent header can flash the dot without reaching into RideFlow's state.
 */
export function useRideStatus() {
  const { rideState } = useQryde();
  const accel = useAccelerometer();

  useEffect(() => {
    if (rideState === "RIDING") {
      accel.start();
    } else {
      accel.stop();
    }
    return () => accel.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideState]);

  return { rideState, collision: accel.collision };
}
