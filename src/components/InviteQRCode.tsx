"use client";

import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

/**
 * Renders a scannable QR code for an invite code so members can join in
 * person without manually typing the 6-character code.
 */
export function InviteQRCode({ value, size = 160 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    setError(false);
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 1,
      color: { dark: "#f2e9da", light: "#00000000" },
    }).catch(() => setError(true));
  }, [value, size]);

  if (error) return null;

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="rounded-lg bg-surface-sunken border border-border"
      aria-label={`QR code for invite code ${value}`}
    />
  );
}
