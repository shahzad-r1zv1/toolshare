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
    "px-3 py-2 rounded-2xl text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1 focus:ring-offset-gray-900";
  const map: Record<string, string> = {
    primary: "bg-emerald-600 hover:bg-emerald-500 text-white",
    secondary: "bg-gray-800 hover:bg-gray-700 text-gray-100",
    ghost: "bg-transparent hover:bg-gray-800 text-gray-100",
    danger: "bg-red-600 hover:bg-red-500 text-white",
  };
  const disabledStyle = "opacity-50 cursor-not-allowed";
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
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-sm">
      {children}
    </div>
  );
}

export function Avatar({ name }: { name: string }) {
  return (
    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-700 text-white text-xs font-bold shrink-0">
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
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-gray-950 border border-gray-800 rounded-2xl p-4 max-w-lg w-full animate-in">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-lg">{title}</h4>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
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
      className={`${sizeMap[size]} animate-spin text-emerald-500`}
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
    <div className="min-h-screen bg-black text-gray-100 flex flex-col items-center justify-center gap-3">
      <Spinner size="lg" />
      <p className="text-gray-400 text-sm">Loading ToolShare…</p>
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
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && (
        <div className="text-gray-600 mb-3">{icon}</div>
      )}
      <h3 className="text-gray-300 font-medium mb-1">{title}</h3>
      {description && (
        <p className="text-gray-500 text-sm max-w-xs">{description}</p>
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
    success: "bg-emerald-900/90 border-emerald-700 text-emerald-100",
    error: "bg-red-900/90 border-red-700 text-red-100",
    info: "bg-blue-900/90 border-blue-700 text-blue-100",
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
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-3 rounded-xl border text-sm font-medium shadow-lg flex items-center gap-2 ${colorMap[type]}`}
      role="alert"
    >
      <span className="font-bold">{iconMap[type]}</span>
      {message}
      <button
        onClick={onDismiss}
        className="ml-2 opacity-70 hover:opacity-100"
        aria-label="Dismiss"
      >
        ×
      </button>
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
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[55]"
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="bg-gray-950 border border-gray-800 rounded-2xl p-5 max-w-sm w-full">
        <h4 className="font-semibold text-lg mb-2">{title}</h4>
        <p className="text-gray-400 text-sm mb-4">{message}</p>
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
        className={`${sizeMap[size]} object-cover rounded-md border border-gray-700 shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeMap[size]} flex items-center justify-center bg-gray-800 ${textMap[size]} text-gray-400 rounded-md shrink-0`}
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
      <label className="block text-sm font-medium text-gray-300 mb-1">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-red-400 text-xs mt-1">{error}</p>
      )}
    </div>
  );
}
