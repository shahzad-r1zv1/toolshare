"use client";

import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

export const JOIN_PARAM = "join";
const PENDING_JOIN_KEY = "toolshare_pending_join";

/** Builds the URL a scanned invite QR code should open: the app itself, with the invite code attached. */
export const inviteUrl = (inviteCode: string): string => {
  if (typeof window === "undefined") return inviteCode;
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set(JOIN_PARAM, inviteCode);
  return url.toString();
};

/**
 * Reads `?join=CODE` off the current URL (if present), stashes it in
 * sessionStorage so it survives the `/` -> `/login` -> `/` redirect round
 * trip for a signed-out scanner, and strips it from the visible URL.
 */
export const capturePendingJoinCode = () => {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const code = url.searchParams.get(JOIN_PARAM);
  if (!code) return;
  sessionStorage.setItem(PENDING_JOIN_KEY, code);
  url.searchParams.delete(JOIN_PARAM);
  window.history.replaceState({}, "", url.toString());
};

/** Consumes (reads + clears) a previously captured pending join code, if any. */
export const takePendingJoinCode = (): string | null => {
  if (typeof window === "undefined") return null;
  const code = sessionStorage.getItem(PENDING_JOIN_KEY);
  if (code) sessionStorage.removeItem(PENDING_JOIN_KEY);
  return code;
};

/**
 * Renders a scannable QR code that opens ToolShare directly to a join flow
 * for this circle, so members can join in person without manually typing
 * the 6-character code.
 */
export function InviteQRCode({ value, size = 160 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    setError(false);
    // The QR library draws to a raw canvas and can't consume CSS custom
    // properties, so read the resolved --ink value at draw time to stay
    // correct across the light/dark Community Kit palettes.
    const ink = getComputedStyle(canvasRef.current).getPropertyValue("--ink").trim() || "#2c2620";
    QRCode.toCanvas(canvasRef.current, inviteUrl(value), {
      width: size,
      margin: 1,
      color: { dark: ink, light: "#00000000" },
    }).catch(() => setError(true));
  }, [value, size]);

  if (error) return null;

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="rounded-2xl bg-surface-sunken border-2 border-border"
      aria-label={`QR code for invite code ${value}`}
    />
  );
}
