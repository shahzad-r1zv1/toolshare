"use client";

import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { Modal, Button, FormField, ThemeToggle, Avatar } from "@/components/ui";

const DEFAULT_SCOPE_KEY = "toolshare_default_search_scope";

export type SearchScope = "circle" | "network";

export const getStoredDefaultScope = (): SearchScope => {
  if (typeof window === "undefined") return "circle";
  return localStorage.getItem(DEFAULT_SCOPE_KEY) === "network" ? "network" : "circle";
};

export function SettingsModal({
  onClose,
  onManageCircles,
  onDone,
}: {
  onClose: () => void;
  onManageCircles: () => void;
  onDone: (message: string) => void;
}) {
  const { user, offlineMode, updateDisplayName, signOut } = useAuth();
  const [name, setName] = React.useState(user?.displayName || "");
  const [saving, setSaving] = React.useState(false);
  const [defaultScope, setDefaultScope] = React.useState<SearchScope>(getStoredDefaultScope());

  const nameChanged = name.trim() && name.trim() !== (user?.displayName || "");

  const saveName = async () => {
    if (!nameChanged) return;
    setSaving(true);
    try {
      await updateDisplayName(name);
      onDone("Name updated.");
    } catch (err) {
      onDone(err instanceof Error ? err.message : "Couldn't update your name.");
    } finally {
      setSaving(false);
    }
  };

  const changeDefaultScope = (scope: SearchScope) => {
    setDefaultScope(scope);
    localStorage.setItem(DEFAULT_SCOPE_KEY, scope);
  };

  return (
    <Modal title="Settings" onClose={onClose}>
      <div>
        <h5 className="text-xs font-bold uppercase tracking-wide text-ink-faint mb-2">
          Account
        </h5>
        <div className="flex items-center gap-3 mb-3">
          {user?.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoURL}
              alt={user.displayName || "User"}
              className="w-12 h-12 rounded-full border-2 border-border"
              referrerPolicy="no-referrer"
            />
          ) : (
            <Avatar name={user?.displayName || user?.email || "You"} />
          )}
          <div className="min-w-0">
            <p className="text-sm text-ink-muted truncate">{user?.email}</p>
            {offlineMode && (
              <p className="text-xs text-warn">Offline demo — not saved to an account</p>
            )}
          </div>
        </div>
        <FormField label="Display name">
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="flex-1 min-w-0 px-3 py-2 bg-surface border-2 border-border rounded-2xl text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent"
            />
            <Button kind="secondary" onClick={saveName} disabled={!nameChanged || saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </FormField>
      </div>

      <div className="border-t-2 border-border pt-3">
        <h5 className="text-xs font-bold uppercase tracking-wide text-ink-faint mb-2">
          Preferences
        </h5>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-ink">Theme</span>
          <ThemeToggle />
        </div>
        <FormField label="Default search scope">
          <div className="flex bg-surface-sunken border-2 border-border rounded-full p-1 text-xs font-bold w-fit">
            <button
              onClick={() => changeDefaultScope("circle")}
              className={`px-3 py-1 rounded-full transition-colors ${
                defaultScope === "circle" ? "bg-accent text-accent-ink" : "text-ink-muted"
              }`}
            >
              This circle
            </button>
            <button
              onClick={() => changeDefaultScope("network")}
              className={`px-3 py-1 rounded-full transition-colors ${
                defaultScope === "network" ? "bg-accent text-accent-ink" : "text-ink-muted"
              }`}
            >
              All circles
            </button>
          </div>
        </FormField>
      </div>

      <div className="border-t-2 border-border pt-3">
        <h5 className="text-xs font-bold uppercase tracking-wide text-ink-faint mb-2">
          Circles
        </h5>
        <Button
          kind="secondary"
          onClick={() => {
            onClose();
            onManageCircles();
          }}
        >
          Manage circles
        </Button>
      </div>

      <div className="border-t-2 border-border pt-3">
        <Button kind="danger" onClick={signOut}>
          Sign Out
        </Button>
      </div>
    </Modal>
  );
}
