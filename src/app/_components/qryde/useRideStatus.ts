"use client";

import { useEffect, useState } from "react";
import { useQryde } from "../QrydeProvider";

/**
 * Listens to the ride state so the header can show a collision ping when
 * the accelerometer fires while the user is in a trip.
 */
export function useRideStatus() {
  const { rideState, wallet } = useQryde();
  const [collision, setCollision] = useState(false);

  useEffect(() => {
    if (rideState !== "RIDING") {
      setCollision(false);
      return;
    }
    setCollision(wallet.collision);
  }, [rideState, wallet.collision]);

  return { rideState, collision };
}
