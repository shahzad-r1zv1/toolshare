"use client";

import React, { useState } from "react";
import { Button, Modal, Spinner, ConfirmDialog } from "./ui";
import { InviteQRCode } from "./InviteQRCode";
import type { Circle } from "@/lib/types";

const inputClass =
  "w-full px-3 py-2 bg-surface-sunken border border-border rounded-lg text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent";

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
        <div className="bg-bad-soft border border-bad/40 rounded-lg px-4 py-3 text-sm text-bad">
          {error}
        </div>
      )}

      <div>
        <h4 className="font-display font-semibold mb-1 text-ink">Create a new circle</h4>
        <p className="text-xs text-ink-muted mb-2">
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

      <div className="border-t border-border pt-4">
        <h4 className="font-display font-semibold mb-1 text-ink">Join with an invite code</h4>
        <p className="text-xs text-ink-muted mb-2">
          Got a code from a friend? Enter it here to join their circle.
        </p>
        {canJoin ? (
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g., XK4P7Q"
              className={`${inputClass} font-tag tracking-widest`}
              onKeyDown={(e) => {
                if (e.key === "Enter" && code.trim()) handleJoin();
              }}
            />
            <Button kind="secondary" onClick={handleJoin} disabled={busy !== null || !code.trim()}>
              {busy === "join" ? <Spinner size="sm" /> : "Join"}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-warn">
            Joining other people&apos;s circles needs the cloud version — configure
            Firebase to enable it.
          </p>
        )}
      </div>
    </div>
  );
}

export function InviteModal({
  circleName,
  inviteCode,
  onClose,
  onCopy,
}: {
  circleName: string;
  inviteCode: string;
  onClose: () => void;
  onCopy: () => void;
}) {
  return (
    <Modal title={`Invite to "${circleName}"`} onClose={onClose}>
      <p className="text-sm text-ink-muted text-center">
        Scan this code or share the invite code below to add someone to your
        circle.
      </p>
      <div className="flex justify-center py-2">
        <InviteQRCode value={inviteCode} size={180} />
      </div>
      <button
        onClick={onCopy}
        className="w-full text-center font-tag text-lg tracking-[0.3em] bg-surface-sunken border border-border rounded-lg py-3 text-ink hover:border-accent transition-colors"
        title="Click to copy the invite code"
      >
        {inviteCode}
      </button>
      <Button onClick={onCopy}>Copy Code</Button>
    </Modal>
  );
}

function LeaveCircleSection({
  circles,
  leaveCircle,
  onDone,
}: {
  circles: Circle[];
  leaveCircle: (circleId: string) => Promise<void>;
  onDone: (message: string) => void;
}) {
  const [pending, setPending] = useState<Circle | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (circles.length === 0) return null;

  const confirmLeave = async () => {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      await leaveCircle(pending.id);
      onDone(`Left "${pending.name}"`);
      setPending(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to leave circle.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-t border-border pt-4">
      <h4 className="font-display font-semibold mb-1 text-ink">Your circles</h4>
      <p className="text-xs text-ink-muted mb-2">
        Leaving removes you as a member; your items in that circle are
        removed too. Blocked while you have an active loan there.
      </p>
      {error && (
        <div className="bg-bad-soft border border-bad/40 rounded-lg px-4 py-3 text-sm text-bad mb-2">
          {error}
        </div>
      )}
      <div className="space-y-2">
        {circles.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between bg-surface-sunken border border-border rounded-lg px-3 py-2"
          >
            <span className="text-sm text-ink">{c.name}</span>
            <Button kind="ghost" onClick={() => setPending(c)}>
              Leave
            </Button>
          </div>
        ))}
      </div>

      {pending && (
        <ConfirmDialog
          title="Leave Circle"
          message={`Leave "${pending.name}"? Any items you've shared there will be removed. This can't be undone.`}
          confirmLabel={busy ? "Leaving…" : "Leave"}
          onConfirm={confirmLeave}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}

export function CircleManagerModal({
  circles,
  createCircle,
  joinCircle,
  leaveCircle,
  canJoin,
  onClose,
  onDone,
}: {
  circles: Circle[];
  createCircle: (name: string) => Promise<void>;
  joinCircle: (code: string) => Promise<void>;
  leaveCircle: (circleId: string) => Promise<void>;
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
      <LeaveCircleSection
        circles={circles}
        leaveCircle={leaveCircle}
        onDone={onDone}
      />
    </Modal>
  );
}
