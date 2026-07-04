"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { FiCamera, FiZap } from "react-icons/fi";

interface QrScannerProps {
  /** Called once with the decoded raw string. */
  onDecoded: (raw: string) => void;
  /** Deep link used by the "simulate scan" fallback. */
  simulatedValue: string;
}

/**
 * Wraps html5-qrcode with careful lifecycle handling so the camera stream is
 * always torn down between transitions (avoids dual-stream crashes / leaks).
 * Because embedded preview frames frequently block camera access, a graceful
 * error state plus a "Simulate scan" button keep the flow demonstrable.
 */
export function QrScanner({ onDecoded, simulatedValue }: QrScannerProps) {
  const reactId = useId();
  const regionId = `qryde-qr-region-${reactId.replace(/:/g, "")}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const decodedRef = useRef(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    decodedRef.current = false;
    const element = document.getElementById(regionId);
    if (!element) return;

    const instance = new Html5Qrcode(regionId, { verbose: false });
    scannerRef.current = instance;

    const handleSuccess = (decodedText: string) => {
      if (decodedRef.current) return;
      decodedRef.current = true;
      instance
        .stop()
        .catch(() => undefined)
        .finally(() => onDecoded(decodedText));
    };

    instance
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 230, height: 230 } },
        handleSuccess,
        undefined,
      )
      .then(() => {
        if (!cancelled) setStarting(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setStarting(false);
        setCameraError(
          err instanceof Error ? err.message : "Unable to access camera.",
        );
      });

    return () => {
      cancelled = true;
      const active = scannerRef.current;
      scannerRef.current = null;
      if (!active) return;
      // html5-qrcode throws "Cannot stop, scanner is not running or paused"
      // when .start() never resolved (camera blocked / component unmounted
      // before start). Only call stop() if the scanner actually started.
      const wasRunning = (active as unknown as { isScanning?: boolean }).isScanning;
      const teardown = wasRunning
        ? active.stop().catch(() => undefined)
        : Promise.resolve();
      teardown.finally(() => {
        try {
          active.clear();
        } catch {
          /* already cleared */
        }
      });
    };
  }, [onDecoded, regionId]);

  const simulate = () => {
    if (decodedRef.current) return;
    decodedRef.current = true;
    const active = scannerRef.current;
    if (!active) {
      onDecoded(simulatedValue);
      return;
    }
    const wasRunning = (active as unknown as { isScanning?: boolean }).isScanning;
    const teardown = wasRunning
      ? active.stop().catch(() => undefined)
      : Promise.resolve();
    teardown.finally(() => onDecoded(simulatedValue));
  };

  return (
    <div className="qr-scanner">
      <div className="qr-scanner__viewport">
        <div id={regionId} className="qr-scanner__video" />

        {/* Framing reticle overlay */}
        <div className="qr-scanner__reticle-wrap">
          <div className="qr-scanner__reticle">
            <span className="qr-scanner__corner qr-scanner__corner--tl" />
            <span className="qr-scanner__corner qr-scanner__corner--tr" />
            <span className="qr-scanner__corner qr-scanner__corner--bl" />
            <span className="qr-scanner__corner qr-scanner__corner--br" />
            <div className="qr-scanner__scanline" />
          </div>
        </div>

        {starting && !cameraError && (
          <div className="qr-scanner__overlay qr-scanner__overlay--loading">
            Starting camera…
          </div>
        )}

        {cameraError && (
          <div className="qr-scanner__overlay qr-scanner__overlay--error">
            <FiCamera className="qr-scanner__overlay-icon" />
            <span className="qr-scanner__overlay-title">Camera unavailable in this view</span>
            <span className="qr-scanner__overlay-hint">
              Use the simulate button below to continue the demo.
            </span>
          </div>
        )}
      </div>

      <button type="button" onClick={simulate} className="qr-scanner__simulate">
        <FiZap className="qr-scanner__simulate-icon" /> Simulate scan
      </button>
    </div>
  );
}
