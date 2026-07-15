"use client";

import React, { useState } from "react";
import { Button, Modal, Spinner } from "./ui";

const inputClass =
  "w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500";

export function CircleForms({
  createCircle,
  joinCircle,
  canJoin,
  onDone,
}: {
  createCircle: (name: string) => Promise<void>;
  joinCircle: (code: string) => Promise<void>;
  canJoin: boolean;
  onDone: (message: string) => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setError(null);
    setBusy("create");
    try {
      await createCircle(name);
      setName("");
      onDone(`Circle "${name.trim()}" created`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create circle.");
    } finally {
      setBusy(null);
    }
  };

  const handleJoin = async () => {
    setError(null);
    setBusy("join");
    try {
      await joinCircle(code);
      setCode("");
      onDone("Joined circle!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join circle.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div>
        <h4 className="font-medium mb-1">Create a new circle</h4>
        <p className="text-xs text-gray-500 mb-2">
          Start a circle for your family, friends, or neighbors, then share its
          invite code with them.
        </p>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Maple Street Neighbors"
            className={inputClass}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) handleCreate();
            }}
          />
          <Button onClick={handleCreate} disabled={busy !== null || !name.trim()}>
            {busy === "create" ? <Spinner size="sm" /> : "Create"}
          </Button>
        </div>
      </div>

      <div className="border-t border-gray-800 pt-4">
        <h4 className="font-medium mb-1">Join with an invite code</h4>
        <p className="text-xs text-gray-500 mb-2">
          Got a code from a friend? Enter it here to join their circle.
        </p>
        {canJoin ? (
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g., XK4P7Q"
              className={`${inputClass} font-mono tracking-widest`}
              onKeyDown={(e) => {
                if (e.key === "Enter" && code.trim()) handleJoin();
              }}
            />
            <Button kind="secondary" onClick={handleJoin} disabled={busy !== null || !code.trim()}>
              {busy === "join" ? <Spinner size="sm" /> : "Join"}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-yellow-500">
            Joining other people&apos;s circles needs the cloud version — configure
            Firebase to enable it.
          </p>
        )}
      </div>
    </div>
  );
}

export function CircleManagerModal({
  createCircle,
  joinCircle,
  canJoin,
  onClose,
  onDone,
}: {
  createCircle: (name: string) => Promise<void>;
  joinCircle: (code: string) => Promise<void>;
  canJoin: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  return (
    <Modal title="Circles" onClose={onClose}>
      <CircleForms
        createCircle={createCircle}
        joinCircle={joinCircle}
        canJoin={canJoin}
        onDone={(msg) => {
          onDone(msg);
          onClose();
        }}
      />
    </Modal>
  );
}
