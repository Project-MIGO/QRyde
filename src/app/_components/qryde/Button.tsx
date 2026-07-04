"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "accent" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  full?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "lg",
  full = true,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  const cls = [
    "btn",
    `btn--${variant}`,
    size === "md" && "btn--sm",
    size === "sm" && "btn--sm",
    full ? "" : "btn--no-full",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button {...rest} className={cls}>
      {children}
    </button>
  );
}
