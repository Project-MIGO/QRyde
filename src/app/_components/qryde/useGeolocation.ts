import { useCallback, useRef, useState } from "react";
import type { GeoPoint } from "./types";

const EARTH_RADIUS_KM = 6371;

/** Haversine distance in kilometers between two coordinates. */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface GeolocationController {
  distanceKm: number;
  current: GeoPoint | null;
  start: GeoPoint | null;
  isSimulated: boolean;
  /** Smoothed speed in km/h, derived from successive haversine deltas. */
  speedKph: number;
  begin: () => void;
  stop: () => void;
  reset: () => void;
}

/**
 * Tracks cumulative travel distance using the Geolocation API's watchPosition
 * with high accuracy. If real geolocation is unavailable or denied (common in
 * embedded preview frames), it falls back to a simulated route so the ride flow
 * remains demonstrable.
 */
export function useGeolocation(): GeolocationController {
  const [distanceKm, setDistanceKm] = useState(0);
  const [current, setCurrent] = useState<GeoPoint | null>(null);
  const [start, setStart] = useState<GeoPoint | null>(null);
  const [isSimulated, setIsSimulated] = useState(false);
  const [speedKph, setSpeedKph] = useState(0);

  const watchIdRef = useRef<number | null>(null);
  const simTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPointRef = useRef<GeoPoint | null>(null);
  const speedBufferRef = useRef<number[]>([]);

  const accumulate = useCallback((point: GeoPoint) => {
    if (lastPointRef.current) {
      const prev = lastPointRef.current;
      const deltaKm = haversineKm(prev, point);
      const dtHours =
        Math.max(0.001, (point.timestamp - prev.timestamp) / 1000 / 3600);
      const instantKph = deltaKm / dtHours;
      // Lightly smooth the speed so the UI doesn't jitter.
      const buf = speedBufferRef.current;
      buf.push(instantKph);
      if (buf.length > 5) buf.shift();
      const avg =
        buf.length === 0 ? 0 : buf.reduce((a, b) => a + b, 0) / buf.length;
      setSpeedKph(Math.max(0, Math.min(avg, 80)));

      if (deltaKm > 0.002) {
        setDistanceKm((d) => d + deltaKm);
      }
    } else {
      setSpeedKph(0);
      speedBufferRef.current = [];
    }
    lastPointRef.current = point;
    setCurrent(point);
  }, []);

  const startSimulation = useCallback(() => {
    setIsSimulated(true);
    let lat = 14.676;
    let lng = 121.0437;
    const startPoint: GeoPoint = { lat, lng, timestamp: Date.now() };
    setStart(startPoint);
    lastPointRef.current = startPoint;
    setCurrent(startPoint);

    simTimerRef.current = setInterval(() => {
      lat += 0.0004 + Math.random() * 0.0002;
      lng += 0.0003 + Math.random() * 0.0002;
      accumulate({ lat, lng, timestamp: Date.now() });
    }, 1500);
  }, [accumulate]);

  const begin = useCallback(() => {
    setDistanceKm(0);
    setSpeedKph(0);
    lastPointRef.current = null;
    speedBufferRef.current = [];
    setStart(null);
    setCurrent(null);

    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      startSimulation();
      return;
    }

    let gotFirstFix = false;
    const fallback = setTimeout(() => {
      if (!gotFirstFix) startSimulation();
    }, 4000);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        gotFirstFix = true;
        clearTimeout(fallback);
        const point: GeoPoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: pos.timestamp,
        };
        if (!start) setStart(point);
        // Use browser-reported speed when available (more accurate than deltas).
        if (typeof pos.coords.speed === "number" && pos.coords.speed >= 0) {
          setSpeedKph(Math.min(pos.coords.speed * 3.6, 80));
        }
        accumulate(point);
      },
      () => {
        clearTimeout(fallback);
        startSimulation();
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
    );
  }, [accumulate, start, startSimulation]);

  const stop = useCallback(() => {
    if (
      watchIdRef.current !== null &&
      typeof window !== "undefined" &&
      "geolocation" in navigator
    ) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stop();
    setDistanceKm(0);
    setSpeedKph(0);
    setCurrent(null);
    setStart(null);
    setIsSimulated(false);
    lastPointRef.current = null;
    speedBufferRef.current = [];
  }, [stop]);

  return {
    distanceKm,
    current,
    start,
    isSimulated,
    speedKph,
    begin,
    stop,
    reset,
  };
}
