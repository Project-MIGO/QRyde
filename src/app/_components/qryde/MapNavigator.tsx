"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { GeoPoint } from "./types";

// ---------------------------------------------------------------------------
// Dynamically import ALL react-leaflet components so Leaflet is never
// loaded during SSR (avoids "window is not defined" with Turbopack).
// ---------------------------------------------------------------------------
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false },
);
const Marker = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false },
);
const Popup = dynamic(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false },
);
const Polyline = dynamic(
  () => import("react-leaflet").then((m) => m.Polyline),
  { ssr: false },
);

// ---------------------------------------------------------------------------
// Leaflet icon factory — loaded dynamically on the client only.
// ---------------------------------------------------------------------------
function useLeafletIcons() {
  const [mod, setMod] = useState<{
    L: typeof import("leaflet");
    startIcon: import("leaflet").Icon;
    endIcon: import("leaflet").Icon;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled) return;
      const leaflet = L.default ?? L;

      // Fix default marker icon paths for bundlers.
      delete (leaflet.Icon.Default.prototype as Record<string, unknown>)
        ._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const startIcon = new leaflet.Icon({
        iconUrl:
          "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      const endIcon = new leaflet.Icon({
        iconUrl:
          "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      setMod({ L: leaflet, startIcon, endIcon });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return mod;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface MapNavigatorProps {
  /** Full array of path points (geo + timestamp), in order. */
  path: GeoPoint[];
  /** Current GPS position (moving blue dot). */
  current: GeoPoint | null;
  /** Start position (green pin). */
  start: GeoPoint | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders a Leaflet map that traces the user's traveled path with a polyline
 * and shows start (green) / current (blue) markers.
 *
 * Leaflet CSS is injected via a <link> tag on first mount so it works inside
 * embedded preview frames without a global stylesheet import.
 */
export function MapNavigator({ path, current, start }: MapNavigatorProps) {
  const leaflet = useLeafletIcons();
  const [cssReady, setCssReady] = useState(false);

  // Inject Leaflet CSS once.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.getElementById("leaflet-css")) {
      setCssReady(true);
      return;
    }
    const link = document.createElement("link");
    link.id = "leaflet-css";
    link.rel = "stylesheet";
    link.href =
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    link.integrity =
      "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
    link.crossOrigin = "";
    link.onload = () => setCssReady(true);
    link.onerror = () => setCssReady(true); // proceed anyway
    document.head.appendChild(link);
  }, []);

  // Path as [lat, lng][] for the polyline.
  const positions: [number, number][] = useMemo(
    () => path.map((p) => [p.lat, p.lng] as [number, number]),
    [path],
  );

  // Center: prefer current > start > midpoint of path > Quezon City default.
  const center: [number, number] = useMemo(() => {
    if (current) return [current.lat, current.lng];
    if (start) return [start.lat, start.lng];
    if (positions.length > 0) {
      const lats = positions.map((p) => p[0]);
      const lngs = positions.map((p) => p[1]);
      return [
        (Math.min(...lats) + Math.max(...lats)) / 2,
        (Math.min(...lngs) + Math.max(...lngs)) / 2,
      ];
    }
    return [14.676, 121.0437]; // Default: Quezon City
  }, [current, start, positions]);

  // ---- loading state ----
  if (!leaflet || !cssReady) {
    return (
      <div className="map-loading">
        <div className="map-loading__spinner" />
        <span>Loading map…</span>
      </div>
    );
  }

  return (
    <div className="map-navigator">
      <MapContainer
        center={center}
        zoom={15}
        className="map-navigator__container"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />

        {/* Start marker — green pin */}
        {start && (
          <Marker position={[start.lat, start.lng]} icon={leaflet.startIcon}>
            <Popup>Start</Popup>
          </Marker>
        )}

        {/* Current GPS position — blue pin */}
        {current && (
          <Marker position={[current.lat, current.lng]}>
            <Popup>
              Lat: {current.lat.toFixed(5)}<br />
              Lng: {current.lng.toFixed(5)}
            </Popup>
          </Marker>
        )}

        {/* Traveled path polyline */}
        {positions.length >= 2 && (
          <Polyline
            positions={positions}
            pathOptions={{
              color: "#1a4d3a",
              weight: 4,
              opacity: 0.7,
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
