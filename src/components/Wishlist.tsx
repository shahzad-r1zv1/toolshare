"use client";

import React, { useState } from "react";
import { Button, Card, Modal, EmptyState, Avatar, FormField, Toast } from "./ui";
import { uid, now } from "@/lib/helpers";
import type { State, WishlistEntry } from "@/lib/types";

export function Wishlist({
  state,
  setState,
  activeCircleId,
  search,
}: {
  state: State;
  setState: React.Dispatch<React.SetStateAction<State>>;
  activeCircleId: string;
  search: string;
}) {
  const you = state.user.id;
  const findUser = (id: string) =>
    [state.user, ...state.friends].find((u) => u.id === id);

  const entries = state.wishlist
    .filter((w) => w.circleId === activeCircleId)
    .filter((w) => w.title.toLowerCase().includes(search.toLowerCase()));

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" } | null>(null);

  const openNew = () => {
    setTitle("");
    setNote("");
    setError("");
    setOpen(true);
  };

  const addEntry = () => {
    if (!title.trim()) {
      setError("What are you looking for?");
      return;
    }
    const entry: WishlistEntry = {
      id: uid(),
      circleId: activeCircleId,
      requesterId: you,
      title: title.trim(),
      note: note.trim() || undefined,
      createdAt: now(),
    };
    setState((s) => ({ ...s, wishlist: [entry, ...s.wishlist] }));
    setOpen(false);
    setToast({ message: `Posted "${entry.title}" to the wishlist`, type: "success" });
  };

  const removeEntry = (entry: WishlistEntry) => {
    setState((s) => ({ ...s, wishlist: s.wishlist.filter((w) => w.id !== entry.id) }));
    setToast({ message: `Removed "${entry.title}" from the wishlist`, type: "info" });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-lg text-ink">Wishlist</h3>
          <p className="text-xs text-ink-muted">
            Ask your circle for tools nobody&apos;s posted yet
          </p>
        </div>
        <Button onClick={openNew}>+ Ask for Something</Button>
      </div>

      {entries.length === 0 && (
        <EmptyState
          icon={
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          }
          title={search ? "No matching wishlist items" : "Nothing on the wishlist"}
          description={
            search
              ? "Try a different search."
              : "Need a tool nobody in your circle has posted? Ask for it here."
          }
          action={!search ? <Button onClick={openNew}>+ Ask for Something</Button> : undefined}
        />
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {entries.map((entry) => {
          const requester = findUser(entry.requesterId);
          const isMine = entry.requesterId === you;
          return (
            <Card key={entry.id}>
              <div className="flex gap-3 items-start">
                <Avatar name={requester?.name || "?"} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate text-ink">{entry.title}</div>
                  <div className="text-xs text-ink-muted">
                    Wanted by <b>{isMine ? "you" : requester?.name || "someone"}</b>
                  </div>
                  {entry.note && (
                    <div className="text-xs text-ink-faint mt-1">{entry.note}</div>
                  )}
                </div>
                {isMine && (
                  <Button kind="ghost" onClick={() => removeEntry(entry)}>
                    Remove
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {open && (
        <Modal title="Ask for Something" onClose={() => setOpen(false)}>
          <FormField label="What do you need?" error={error}>
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError("");
              }}
              placeholder="e.g., Pressure washer"
              className="w-full px-3 py-2 bg-surface-sunken border-2 border-border rounded-2xl text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent"
              autoFocus
            />
          </FormField>
          <FormField label="Details (optional)">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="When you need it, what for, etc."
              rows={2}
              className="w-full px-3 py-2 bg-surface-sunken border-2 border-border rounded-2xl text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent resize-none"
            />
          </FormField>
          <div className="flex gap-2 pt-1">
            <Button onClick={addEntry}>Post to Wishlist</Button>
            <Button kind="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </Modal>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
