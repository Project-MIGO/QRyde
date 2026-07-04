"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { GeoPoint } from "./types";

/**
 * Keeps the Leaflet map centred on the live GPS position.
 *
 * react-leaflet's `MapContainer` only honours `center`/`zoom` on initial mount,
 * so once the ride starts (map mounts with the default Quezon City centre) it
 * would never follow the user — the blue "current" marker and the traced
 * polyline end up off-screen. This child hooks into the map instance via
 * `useMap` and pans to `current` whenever it moves.
 *
 * Lives in its own module so it can statically import `useMap` from
 * react-leaflet without pulling Leaflet into the SSR bundle.
 */
export function MapFollower({ current }: { current: GeoPoint | null }) {
  const map = useMap();

  useEffect(() => {
    if (!current) return;
    // Don't fight the user if they zoomed out to inspect the whole route:
    // only recentre when the new position falls outside the current view.
    const target: [number, number] = [current.lat, current.lng];
    if (!map.getBounds().contains(target)) {
      map.panTo(target, { animate: true });
    }
  }, [map, current]);

  return null;
}