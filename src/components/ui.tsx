"use client";

import React from "react";
import { applyTheme, getStoredTheme, type Theme } from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = React.useState<Theme>("dark");

  React.useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "light" ? "light" : getStoredTheme() || "dark");
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  };

  return (
    <button
      onClick={toggle}
      className="w-9 h-9 flex items-center justify-center bg-surface-sunken hover:bg-surface-raised border-2 border-border text-ink rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1.5m0 15V21m9-9h-1.5M4.5 12H3m15.36 6.36l-1.06-1.06M6.7 6.7L5.64 5.64m12.72 0l-1.06 1.06M6.7 17.3l-1.06 1.06M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
        </svg>
      )}
    </button>
  );
}

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
    "px-4 py-2.5 rounded-2xl text-sm font-bold tracking-tight border-2 transition-all duration-100 active:translate-y-[3px] focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg";
  const map: Record<string, string> = {
    primary:
      "bg-accent hover:bg-accent-strong text-accent-ink border-border shadow-[0_3px_0_0_var(--border)] active:shadow-none",
    secondary:
      "bg-surface-raised hover:bg-surface-sunken text-ink border-border shadow-[0_3px_0_0_var(--border)] active:shadow-none",
    ghost: "bg-transparent hover:bg-surface-raised text-ink border-transparent",
    danger:
      "bg-bad hover:brightness-105 text-accent-ink border-border shadow-[0_3px_0_0_var(--border)] active:shadow-none",
  };
  const disabledStyle = "opacity-40 cursor-not-allowed active:translate-y-0 active:shadow-[0_3px_0_0_var(--border)]";
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
    <div className="bg-surface border-2 border-border rounded-3xl p-4 shadow-[0_4px_0_0_hsl(var(--shadow-color)/0.15)]">
      {children}
    </div>
  );
}

/**
 * Coral/teal/sunshine palette so each circle member gets a distinct but
 * harmonious color pulled from the Community Kit accent family, rather than
 * a generic rainbow of SaaS brand colors.
 */
const AVATAR_COLORS = [
  "#ff5a42", // coral
  "#0ea99a", // teal
  "#ffc736", // sunshine
  "#f0508a", // berry pink
  "#3aa0f0", // sky blue
  "#ff9f2e", // apricot
  "#6ab53e", // meadow green
  "#a566f5", // violet
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
      className="w-8 h-8 flex items-center justify-center rounded-full text-white text-xs font-bold shrink-0 font-display border-2 border-border"
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
      <div className="relative bg-surface-raised border-2 border-border rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col animate-in shadow-[0_16px_36px_hsl(var(--shadow-color)/0.35)] overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[4px] kit-edge" />
        <div className="flex items-center justify-between px-4 pt-[19px] pb-3 shrink-0">
          <h4 className="font-display font-bold text-lg tracking-tight text-ink">{title}</h4>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-surface-sunken text-ink-muted hover:text-ink transition-colors"
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
        <div className="grid gap-3 px-4 pb-4 overflow-y-auto">{children}</div>
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
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center border-2 border-dashed border-border rounded-3xl">
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
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-3 rounded-2xl border-2 text-sm font-medium shadow-[0_6px_0_0_hsl(var(--shadow-color)/0.2)] flex items-center gap-2 animate-in ${colorMap[type]}`}
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
  "#ff5a42", // coral
  "#0ea99a", // teal
  "#ffc736", // sunshine
  "#f0508a", // berry pink
  "#3aa0f0", // sky blue
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
      <div className="relative bg-surface-raised border-2 border-border rounded-3xl p-5 max-w-sm w-full shadow-[0_16px_36px_hsl(var(--shadow-color)/0.35)] overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[4px] kit-edge" />
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
        className={`${sizeMap[size]} object-cover rounded-2xl border-2 border-border shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeMap[size]} flex items-center justify-center bg-surface-sunken border-2 border-border ${textMap[size]} text-ink-faint rounded-2xl shrink-0 font-tag uppercase`}
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
