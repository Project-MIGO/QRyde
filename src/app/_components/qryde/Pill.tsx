"use client";

import type { ReactNode } from "react";

type Tone = "accent" | "indigo" | "warning" | "danger" | "neutral" | "invert";

export function Pill({
  children,
  tone = "accent",
  compact = false,
  pulseDot = false,
  icon,
}: {
  children: ReactNode;
  tone?: Tone;
  compact?: boolean;
  pulseDot?: boolean;
  icon?: ReactNode;
}) {
  const cls = [
    "pill",
    `pill--${tone}`,
    compact && "pill--compact",
  ]
    .filter(Boolean)
    .join(" ");

  if (pulseDot) {
    return (
      <span className={cls}>
        <span className={`u-pulse-dot u-pulse-dot--${tone === "accent" ? "accent" : tone === "warning" ? "warning" : tone}`} />
        {icon}
        {children}
      </span>
    );
  }

  return (
    <span className={cls}>
      {icon ? <span className="pill__icon">{icon}</span> : null}
      {children}
    </span>
  );
}
