"use client";

import type { ReactNode } from "react";

export function IconBubble({
  children,
  tone = "indigo",
  size = "md",
}: {
  children: ReactNode;
  tone?: "accent" | "indigo" | "amber" | "danger" | "neutral";
  size?: "sm" | "md";
}) {
  const cls = [
    "icon-bubble",
    `icon-bubble--${tone}`,
    size === "sm" && "icon-bubble--sm",
  ]
    .filter(Boolean)
    .join(" ");
  return <div className={cls}>{children}</div>;
}
