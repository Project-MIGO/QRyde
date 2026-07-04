"use client";

import { FiClock, FiExternalLink, FiMapPin } from "react-icons/fi";
import { useQryde } from "../QrydeProvider";
import { Card } from "./Card";
import { IconBubble } from "./IconBubble";
import { explorerTxUrl } from "@/lib/stellar";
import { peso, truncateKey, type RideHistoryItem } from "./types";

export function HistoryScreen() {
  const { history } = useQryde();

  if (history.length === 0) {
    return (
      <div className="history">
        <div className="card__header">
          <div>
            <div className="card__title">Recent rides</div>
            <div className="card__subtitle">
              Your completed rides appear here.
            </div>
          </div>
        </div>
        <Card className="history__empty-card">
          <div className="history__empty-icon">
            <FiClock />
          </div>
          <div className="history__empty-title">No rides yet</div>
          <p className="history__empty-body">
            Start your first commute from the Home tab - every fare you pay is
            saved here with its on-chain proof.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="history">
      <div className="card__header">
        <div>
          <div className="card__title">Recent rides</div>
          <div className="card__subtitle">
            {history.length} ride{history.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>
      <div className="history__list">
        {history.map((ride) => (
          <RideRow key={ride.id} ride={ride} />
        ))}
      </div>
    </div>
  );
}

function RideRow({ ride }: { ride: RideHistoryItem }) {
  const date = new Date(ride.completedAt);
  return (
    <Card padding="sm">
      <div className="ride-row">
        <IconBubble tone="accent">
          <FiMapPin />
        </IconBubble>
        <div className="ride-row__main">
          <div className="ride-row__title-row">
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="ride-row__title">Vehicle {ride.driver.vehicle}</div>
              <div className="ride-row__subtitle">
                <FiMapPin /> {ride.fromLabel} → {ride.toLabel}
              </div>
            </div>
            <div className="ride-row__amount">
              <div className="ride-row__fare">{peso(ride.farePhpc)}</div>
              {ride.sentAmount !== undefined && (
                <div className="ride-row__sent">
                  {ride.sentAmount.toFixed(
                    ride.sentAsset === "XLM" ? 4 : 2,
                  )}{" "}
                  {ride.sentAsset}
                </div>
              )}
              <div className="ride-row__distance">
                {ride.distanceKm.toFixed(2)} km
              </div>
            </div>
          </div>
          <div className="ride-row__meta">
            <span className="ride-row__date">
              <FiClock />
              {date.toLocaleString("en-PH", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <a
              href={explorerTxUrl(ride.txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="ride-row__tx-link"
            >
              {truncateKey(ride.txHash, 4, 4)} <FiExternalLink />
            </a>
          </div>
        </div>
      </div>
    </Card>
  );
}
