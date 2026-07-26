"use client";

import React from "react";

export function Button({
  onClick,
  children,
  kind = "primary",
  type = "button",
  disabled = false,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  kind?: "primary" | "secondary" | "ghost" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const base =
    "px-3.5 py-2 rounded-lg text-sm font-semibold tracking-tight transition-all duration-100 active:translate-y-px focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg";
  const map: Record<string, string> = {
    primary:
      "bg-accent hover:bg-accent-strong text-accent-ink shadow-[0_1px_0_0_var(--accent-strong)] hover:shadow-[0_2px_0_0_var(--accent-strong)]",
    secondary:
      "bg-surface-raised hover:bg-surface-sunken text-ink border border-border-strong",
    ghost: "bg-transparent hover:bg-surface-raised text-ink",
    danger:
      "bg-bad hover:brightness-110 text-white shadow-[0_1px_0_0_rgba(0,0,0,0.25)]",
  };
  const disabledStyle = "opacity-40 cursor-not-allowed active:translate-y-0";
  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`${base} ${map[kind]} ${disabled ? disabledStyle : ""}`}
    >
      {children}
    </button>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 shadow-[0_1px_2px_hsl(var(--shadow-color)/0.25)]">
      {children}
    </div>
  );
}

/**
 * Warm, workshop-toned palette so each circle member gets a distinct but
 * harmonious color — variations on amber/rust/olive rather than a generic
 * rainbow of SaaS brand colors.
 */
const AVATAR_COLORS = [
  "#c67f1f", // accent amber
  "#b3402b", // rust
  "#5c7a4f", // olive
  "#7a5c8a", // plum
  "#3f7d55", // workshop green
  "#a8690f", // burnt orange
  "#5f7d8a", // slate blue
  "#8a5c3f", // leather brown
];

const colorForName = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export function Avatar({ name }: { name: string }) {
  return (
    <div
      className="w-8 h-8 flex items-center justify-center rounded-full text-white text-xs font-bold shrink-0 font-display"
      style={{ backgroundColor: colorForName(name) }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative bg-surface-raised border border-border rounded-xl p-4 max-w-lg w-full animate-in shadow-[0_12px_32px_hsl(var(--shadow-color)/0.4)] overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[3px] hazard-edge" />
        <div className="flex items-center justify-between mb-3 pt-1">
          <h4 className="font-display font-bold text-lg tracking-tight text-ink">{title}</h4>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-sunken text-ink-muted hover:text-ink transition-colors"
            aria-label="Close dialog"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="grid gap-3">{children}</div>
      </div>
    </div>
  );
}

export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeMap = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-8 h-8" };
  return (
    <svg
      className={`${sizeMap[size]} animate-spin text-accent`}
      fill="none"
      viewBox="0 0 24 24"
      role="status"
      aria-label="Loading"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col items-center justify-center gap-3">
      <Spinner size="lg" />
      <p className="text-ink-muted text-sm font-display tracking-wide uppercase">
        Loading ToolShare…
      </p>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center border border-dashed border-border rounded-xl">
      {icon && <div className="text-ink-faint mb-3">{icon}</div>}
      <h3 className="text-ink font-display font-semibold text-base mb-1">{title}</h3>
      {description && (
        <p className="text-ink-muted text-sm max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Toast({
  message,
  type = "success",
  onDismiss,
}: {
  message: string;
  type?: "success" | "error" | "info";
  onDismiss: () => void;
}) {
  const colorMap = {
    success: "bg-good-soft border-good text-ink",
    error: "bg-bad-soft border-bad text-ink",
    info: "bg-accent-soft border-accent text-ink",
  };
  const iconColorMap = {
    success: "text-good",
    error: "text-bad",
    info: "text-accent",
  };
  const iconMap = {
    success: "✓",
    error: "✕",
    info: "ℹ",
  };

  React.useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-3 rounded-lg border text-sm font-medium shadow-[0_8px_24px_hsl(var(--shadow-color)/0.35)] flex items-center gap-2 animate-in ${colorMap[type]}`}
      role="alert"
    >
      <span className={`font-bold ${iconColorMap[type]}`}>{iconMap[type]}</span>
      {message}
      <button
        onClick={onDismiss}
        className="ml-2 opacity-60 hover:opacity-100"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

const CONFETTI_COLORS = [
  "#e8a23d", // accent amber
  "#b3402b", // rust
  "#5c7a4f", // olive
  "#7a5c8a", // plum
  "#5f7d8a", // slate blue
];

/**
 * A brief CSS-only confetti burst for celebratory moments (approvals,
 * returns). Fully client-rendered, no external animation library.
 */
export function Celebration({ onDone }: { onDone: () => void }) {
  const pieces = React.useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.15,
        duration: 0.9 + Math.random() * 0.6,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotate: Math.random() * 360,
      })),
    []
  );

  React.useEffect(() => {
    const timer = setTimeout(onDone, 1400);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 w-2 h-3 rounded-sm confetti-piece"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  kind = "danger",
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  kind?: "primary" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[55]"
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="relative bg-surface-raised border border-border rounded-xl p-5 max-w-sm w-full shadow-[0_12px_32px_hsl(var(--shadow-color)/0.4)] overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[3px] hazard-edge" />
        <h4 className="font-display font-bold text-lg mb-2 pt-1 text-ink">{title}</h4>
        <p className="text-ink-muted text-sm mb-4">{message}</p>
        <div className="flex gap-2 justify-end">
          <Button kind="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button kind={kind} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ItemPhoto({
  src,
  alt,
  size = "md",
}: {
  src?: string;
  alt: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeMap = {
    sm: "w-10 h-10",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };
  const textMap = {
    sm: "text-[8px]",
    md: "text-[10px]",
    lg: "text-xs",
  };

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={`${sizeMap[size]} object-cover rounded-md border border-border shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeMap[size]} flex items-center justify-center bg-surface-sunken border border-border ${textMap[size]} text-ink-faint rounded-md shrink-0 font-tag uppercase`}
    >
      No Photo
    </div>
  );
}

export function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">
        {label}
      </label>
      {children}
      {error && <p className="text-bad text-xs mt-1">{error}</p>}
    </div>
  );
}
