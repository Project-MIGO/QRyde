"use client";

import type { ReactNode } from "react";
import { TbBike } from "react-icons/tb";
import { BottomNav } from "./BottomNav";
import { useQryde } from "../QrydeProvider";
import { useRideStatus } from "../qryde/useRideStatus";

interface PhoneShellProps {
  title: string;
  showHeader?: boolean;
  showNav?: boolean;
  children: ReactNode;
}

/**
 * The PWA-shaped container:
 * - mobile: full-bleed
 * - desktop: a centered, phone-ratio column with rounded corners + soft shadow
 *
 * Owns the sticky header + bottom nav so individual pages don't repeat boilerplate.
 */
export function PhoneShell({
  title,
  showHeader = true,
  showNav = false,
  children,
}: PhoneShellProps) {
  const { wallet, balances, xlmPhpRate, xlmPhpRateStale } = useQryde();
  const { collision } = useRideStatus();
  const walletReady = wallet.status === "ready" && !!wallet.publicKey;

  return (
    <div className="app-bg" style={{ display: "flex" }}>
      <div className="phone-shell">
        {showHeader && (
          <header className="app-header">
            <div className="app-header__inner">
              <div className="app-header__logo">
                <TbBike />
              </div>
                <div className="app-header__title">
                  <h1>{title}</h1>
                </div>
              <div className="app-header__actions">
                <span
                  className="pill pill--neutral pill--compact"
                  title={
                    xlmPhpRateStale
                      ? "Offline rate (XLM/PHP)"
                      : "Live XLM/PHP rate"
                  }
                >
                  ₱{xlmPhpRate.toFixed(2)} / XLM
                </span>
                {walletReady && balances.balances && !balances.balances.funded && (
                  <span className="pill pill--warning pill--compact">Unfunded</span>
                )}
                {collision && <span className="u-collision-dot" />}
              </div>
            </div>
          </header>
        )}

        <div className="page-body">{children}</div>

        {showNav && <BottomNav />}
      </div>
    </div>
  );
}
