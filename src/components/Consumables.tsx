"use client";

import React, { useState } from "react";
import { Button, Card, Modal, EmptyState, Avatar, FormField, Toast, ItemPhoto } from "./ui";
import { uid, now, filesTo64 } from "@/lib/helpers";
import type { State, Consumable, ConsumableClaim } from "@/lib/types";

const inputClass =
  "w-full px-3 py-2 bg-surface-sunken border-2 border-border rounded-2xl text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent";

export function Consumables({
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

  const items = state.consumables
    .filter((c) => c.circleId === activeCircleId)
    .filter((c) => c.title.toLowerCase().includes(search.toLowerCase()));

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Consumable | null>(null);
  const [title, setTitle] = useState("");
  const [quantity, setQuantity] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" } | null>(null);

  const [claiming, setClaiming] = useState<Consumable | null>(null);
  const [claimAmount, setClaimAmount] = useState("");

  const openNew = () => {
    setEditing(null);
    setTitle("");
    setQuantity("");
    setCategory("");
    setNote("");
    setFiles([]);
    setErrors({});
    setOpen(true);
  };

  const openEdit = (item: Consumable) => {
    setEditing(item);
    setTitle(item.title);
    setQuantity(item.quantity);
    setCategory(item.category || "");
    setNote(item.note || "");
    setFiles([]);
    setErrors({});
    setOpen(true);
  };

  const save = async () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Title is required";
    if (!quantity.trim()) newErrors.quantity = "How much is there?";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    try {
      let photos: string[] = editing ? editing.photos : [];
      if (files.length > 0) photos = await filesTo64(files.slice(0, 3));
      if (editing) {
        setState((s) => ({
          ...s,
          consumables: s.consumables.map((c) =>
            c.id === editing.id
              ? {
                  ...c,
                  title: title.trim(),
                  quantity: quantity.trim(),
                  category: category.trim() || undefined,
                  note: note.trim() || undefined,
                  photos,
                }
              : c
          ),
        }));
        setToast({ message: `"${title}" updated`, type: "success" });
      } else {
        const item: Consumable = {
          id: uid(),
          ownerId: you,
          circleId: activeCircleId,
          title: title.trim(),
          quantity: quantity.trim(),
          category: category.trim() || undefined,
          note: note.trim() || undefined,
          photos,
          createdAt: now(),
        };
        setState((s) => ({ ...s, consumables: [item, ...s.consumables] }));
        setToast({ message: `"${title}" posted for the circle`, type: "success" });
      }
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const remove = (item: Consumable) => {
    setState((s) => ({
      ...s,
      consumables: s.consumables.filter((c) => c.id !== item.id),
      consumableClaims: s.consumableClaims.filter((c) => c.consumableId !== item.id),
    }));
    setToast({ message: `"${item.title}" removed`, type: "info" });
  };

  const openClaim = (item: Consumable) => {
    setClaiming(item);
    setClaimAmount("");
  };

  const submitClaim = () => {
    if (!claiming || !claimAmount.trim()) return;
    const claim: ConsumableClaim = {
      id: uid(),
      consumableId: claiming.id,
      claimerId: you,
      amount: claimAmount.trim(),
      createdAt: now(),
    };
    setState((s) => ({ ...s, consumableClaims: [...s.consumableClaims, claim] }));
    setToast({
      message: `Let ${findUser(claiming.ownerId)?.name || "the owner"} know you're taking ${claimAmount.trim()} of "${claiming.title}"`,
      type: "success",
    });
    setClaiming(null);
    setClaimAmount("");
  };

  const claimsFor = (consumableId: string) =>
    state.consumableClaims.filter((c) => c.consumableId === consumableId);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-lg text-ink">Consumables</h3>
          <p className="text-xs text-ink-muted">
            Leftover paint, wood, screws — things to use up, not borrow and return
          </p>
        </div>
        <Button onClick={openNew}>+ Post Leftovers</Button>
      </div>

      {items.length === 0 && (
        <EmptyState
          icon={
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          }
          title={search ? "No matching consumables" : "Nothing posted yet"}
          description={
            search
              ? "Try a different search."
              : "Got leftover paint, wood, or supplies? Post them so your circle can grab what they need."
          }
          action={!search ? <Button onClick={openNew}>+ Post Leftovers</Button> : undefined}
        />
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => {
          const owner = findUser(item.ownerId);
          const isMine = item.ownerId === you;
          const claims = claimsFor(item.id);
          return (
            <Card key={item.id}>
              <div className="flex gap-3 items-start">
                <ItemPhoto src={item.photos[0]} alt={item.title} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate text-ink">{item.title}</div>
                  <div className="text-xs text-ink-muted flex items-center gap-1.5">
                    <Avatar name={owner?.name || "?"} />
                    <span>{isMine ? "You have" : `${owner?.name || "Someone"} has`}</span>
                    <span className="font-tag text-teal">{item.quantity}</span>
                  </div>
                  {item.category && (
                    <div className="text-xs text-ink-faint mt-0.5">{item.category}</div>
                  )}
                  {item.note && (
                    <div className="text-xs text-ink-faint mt-1">{item.note}</div>
                  )}
                  {claims.length > 0 && (
                    <div className="text-xs text-ink-faint mt-1">
                      Claimed: {claims.map((c) => `${c.amount} by ${findUser(c.claimerId)?.name || "someone"}`).join(", ")}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 items-end shrink-0">
                  {!isMine && (
                    <Button kind="secondary" onClick={() => openClaim(item)}>
                      Claim Some
                    </Button>
                  )}
                  {isMine && (
                    <>
                      <Button kind="ghost" onClick={() => openEdit(item)}>
                        Edit
                      </Button>
                      <Button kind="ghost" onClick={() => remove(item)}>
                        Remove
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {open && (
        <Modal title={editing ? "Edit Listing" : "Post Leftovers"} onClose={() => setOpen(false)}>
          <FormField label="What is it?" error={errors.title}>
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: "" }));
              }}
              placeholder="e.g., Leftover deck paint"
              className={inputClass}
              autoFocus
            />
          </FormField>
          <FormField label="How much?" error={errors.quantity}>
            <input
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                if (errors.quantity) setErrors((prev) => ({ ...prev, quantity: "" }));
              }}
              placeholder="e.g., 2 gallons, 5 boards, half a box"
              className={inputClass}
            />
          </FormField>
          <FormField label="Category (optional)">
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Paint, Lumber, Hardware"
              className={inputClass}
            />
          </FormField>
          <FormField label="Notes (optional)">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Color, condition, pickup details…"
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </FormField>
          <FormField label="Photo (optional)">
            <input
              multiple
              type="file"
              accept="image/*"
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
              className="text-sm text-ink-muted file:mr-3 file:rounded-full file:border-0 file:bg-surface-sunken file:px-3 file:py-2 file:text-sm file:text-ink file:font-bold hover:file:bg-surface-raised"
            />
          </FormField>
          <div className="flex gap-2 pt-1">
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : editing ? "Update" : "Post"}
            </Button>
            <Button kind="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </Modal>
      )}

      {claiming && (
        <Modal title={`Claim "${claiming.title}"`} onClose={() => setClaiming(null)}>
          <p className="text-sm text-ink-muted">
            {findUser(claiming.ownerId)?.name || "The owner"} has{" "}
            <b className="text-ink">{claiming.quantity}</b>. How much do you want?
          </p>
          <FormField label="Amount">
            <input
              value={claimAmount}
              onChange={(e) => setClaimAmount(e.target.value)}
              placeholder="e.g., 1 gallon, 2 boards"
              className={inputClass}
              autoFocus
            />
          </FormField>
          <p className="text-xs text-ink-faint">
            This just lets the owner know — coordinate pickup with them directly.
          </p>
          <div className="flex gap-2 pt-1">
            <Button onClick={submitClaim} disabled={!claimAmount.trim()}>
              Claim
            </Button>
            <Button kind="secondary" onClick={() => setClaiming(null)}>
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
