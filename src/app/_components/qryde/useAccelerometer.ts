import { useCallback, useRef, useState } from "react";

const GRAVITY = 9.8;
const COLLISION_G_THRESHOLD = 4.0;

// iOS 13+ exposes a requestPermission() static method that must be called from
// a user gesture. Other platforms fire DeviceMotionEvent without a prompt.
interface DeviceMotionEventStatic {
  requestPermission?: () => Promise<"granted" | "denied">;
}

export type MotionPermission = "unsupported" | "prompt" | "granted" | "denied";

export interface AccelerometerController {
  gForce: number;
  peakG: number;
  collision: boolean;
  permission: MotionPermission;
  active: boolean;
  requestPermission: () => Promise<void>;
  start: () => void;
  stop: () => void;
  clearCollision: () => void;
  reset: () => void;
}

/**
 * Reads DeviceMotionEvent acceleration and flags a potential collision when the
 * total G-force ( sqrt(x^2+y^2+z^2) / 9.8 ) exceeds 4.0. Handles the iOS Safari
 * explicit permission gesture requirement.
 */
export function useAccelerometer(): AccelerometerController {
  const [gForce, setGForce] = useState(0);
  const [peakG, setPeakG] = useState(0);
  const [collision, setCollision] = useState(false);
  const [active, setActive] = useState(false);
  const [permission, setPermission] = useState<MotionPermission>(() => {
    if (typeof window === "undefined" || !("DeviceMotionEvent" in window)) {
      return "unsupported";
    }
    const dm = window.DeviceMotionEvent as unknown as DeviceMotionEventStatic;
    return typeof dm.requestPermission === "function" ? "prompt" : "granted";
  });

  const handlerRef = useRef<((e: DeviceMotionEvent) => void) | null>(null);
  const collisionRef = useRef(false);

  const attach = useCallback(() => {
    if (typeof window === "undefined" || !("DeviceMotionEvent" in window)) return;

    const handler = (event: DeviceMotionEvent) => {
      const acc =
        event.accelerationIncludingGravity ?? event.acceleration ?? null;
      if (!acc || acc.x == null || acc.y == null || acc.z == null) return;

      const magnitude = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
      const g = magnitude / GRAVITY;
      setGForce(g);
      setPeakG((prev) => (g > prev ? g : prev));

      if (g > COLLISION_G_THRESHOLD && !collisionRef.current) {
        collisionRef.current = true;
        setCollision(true);
      }
    };

    handlerRef.current = handler;
    window.addEventListener("devicemotion", handler);
    setActive(true);
  }, []);

  const start = useCallback(() => {
    if (permission === "granted") attach();
  }, [attach, permission]);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("DeviceMotionEvent" in window)) {
      setPermission("unsupported");
      return;
    }
    const dm = window.DeviceMotionEvent as unknown as DeviceMotionEventStatic;
    if (typeof dm.requestPermission === "function") {
      try {
        const result = await dm.requestPermission();
        if (result === "granted") {
          setPermission("granted");
          attach();
        } else {
          setPermission("denied");
        }
      } catch {
        setPermission("denied");
      }
    } else {
      setPermission("granted");
      attach();
    }
  }, [attach]);

  const stop = useCallback(() => {
    if (handlerRef.current && typeof window !== "undefined") {
      window.removeEventListener("devicemotion", handlerRef.current);
      handlerRef.current = null;
    }
    setActive(false);
  }, []);

  const clearCollision = useCallback(() => {
    collisionRef.current = false;
    setCollision(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    setGForce(0);
    setPeakG(0);
    clearCollision();
  }, [stop, clearCollision]);

  return {
    gForce,
    peakG,
    collision,
    permission,
    active,
    requestPermission,
    start,
    stop,
    clearCollision,
    reset,
  };
}
