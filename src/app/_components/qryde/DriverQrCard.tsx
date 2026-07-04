"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { buildQrydeLink, type DriverInfo } from "./types";

/**
 * Real, scannable QR code renderer for the driver's printed entry/exit board.
 *
 * Encodes a `qryde:entry?driver=...&vehicle=...&name=...` deep link that the
 * passenger app's scanner parses via `parseQrydeLink` in ./types.
 *
 * Why a real QR: the previous version drew a fake noise pattern with corner
 * squares (a visual placeholder). Real QR makes the two-device demo path
 * work — scan the board on a second phone, the ride starts.
 */
export function DriverQrCard({
  driver,
  mode,
  size = 220,
}: {
  driver: DriverInfo;
  mode: "entry" | "exit";
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const link = buildQrydeLink(mode, driver);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    QRCode.toCanvas(canvas, link, {
      width: size,
      margin: 1,
      errorCorrectionLevel: "M",
      color: {
        dark: "#0a0a0a",
        light: "#ffffff",
      },
    }).then(
      () => {
        if (!cancelled) setRenderError(null);
      },
      (err: unknown) => {
        if (cancelled) return;
        setRenderError(err instanceof Error ? err.message : "QR render failed");
      },
    );

    return () => {
      cancelled = true;
    };
  }, [link, size]);

  return (
    <div className="driver-qr">
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="driver-qr__canvas"
      />
      {renderError && (
        <p className="driver-qr__error" role="alert">
          {renderError}
        </p>
      )}
      <p className="driver-qr__payload">{link}</p>
    </div>
  );
}
