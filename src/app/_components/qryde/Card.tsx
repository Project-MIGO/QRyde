"use client";

import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  padding = "md",
}: {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md";
}) {
  const cls = [
    "card",
    padding === "sm" && "card--padded-sm",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <div className={cls}>{children}</div>;
}
