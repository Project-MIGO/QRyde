"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { FiCamera, FiImage, FiZap } from "react-icons/fi";

interface QrScannerProps {
  /** Called once with the decoded raw string. */
  onDecoded: (raw: string) => void;
  /** Deep link used by the "simulate scan" fallback. */
  simulatedValue: string;
}

/**
 * Wraps html5-qrcode with careful lifecycle handling.
 *
 * On iOS (especially Freighter's in-app browser), the camera often can't
 * start inline. We provide two fallbacks:
 * 1. "Upload QR image" — select a photo/screenshot of a QR code
 * 2. "Simulate scan" — use the demo deep link
 */
export function QrScanner({ onDecoded, simulatedValue }: QrScannerProps) {
  const reactId = useId();
  const regionId = `qryde-qr-region-${reactId.replace(/:/g, "")}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const decodedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const [uploading, setUploading] = useState(false);

  // ── Camera-based scanner ──
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

    // Watch for the video element being added so we can add playsinline
    // BEFORE iOS Safari starts playback.
    const mo = new MutationObserver(() => {
      const video = element.querySelector("video") as HTMLVideoElement | null;
      if (video) {
        video.setAttribute("playsinline", "");
        video.setAttribute("webkit-playsinline", "");
        video.style.objectFit = "cover";
        video.style.width = "100%";
        video.style.height = "100%";
        mo.disconnect();
      }
    });
    mo.observe(element, { childList: true, subtree: true });

    instance
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 230, height: 230 }, aspectRatio: 1 },
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
      mo.disconnect();
      cancelled = true;
      const active = scannerRef.current;
      scannerRef.current = null;
      if (!active) return;
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

  // ── Simulate scan ──
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

  // ── Image upload fallback ──
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || decodedRef.current) return;
    setUploading(true);
    try {
      const instance = new Html5Qrcode("qr-upload-tmp", { verbose: false });
      const result = await instance.scanFile(file, false);
      if (!decodedRef.current) {
        decodedRef.current = true;
        onDecoded(result);
      }
    } catch {
      setCameraError("Could not detect a QR code in that image. Try again.");
    } finally {
      setUploading(false);
      // Reset file input so the same file can be re-selected.
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="qr-scanner">
      <div className="qr-scanner__viewport">
        <div id={regionId} className="qr-scanner__video" />

        {/* Hidden div for file-based QR scanning */}
        <div id="qr-upload-tmp" style={{ display: "none" }} />

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
            <span className="qr-scanner__overlay-title">
              Camera unavailable in this view
            </span>
            <span className="qr-scanner__overlay-hint">
              Use the upload or simulate buttons below.
            </span>
          </div>
        )}
      </div>

      <div className="qr-scanner__actions">
        {/* Hidden file input for QR image upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileUpload}
          style={{ display: "none" }}
          id={`qr-file-${regionId}`}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="qr-scanner__simulate"
          disabled={uploading}
        >
          <FiImage className="qr-scanner__simulate-icon" />{" "}
          {uploading ? "Scanning image…" : "Upload QR image"}
        </button>

        <button
          type="button"
          onClick={simulate}
          className="qr-scanner__simulate"
        >
          <FiZap className="qr-scanner__simulate-icon" /> Simulate scan
        </button>
      </div>
    </div>
  );
}
