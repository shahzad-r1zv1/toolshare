"use client";

import React, { useState } from "react";
import {
  Button,
  Card,
  Modal,
  EmptyState,
  ItemPhoto,
  Toast,
  ConfirmDialog,
  FormField,
} from "./ui";
import { uid, now, filesTo64 } from "@/lib/helpers";
import type { State, Item } from "@/lib/types";

export function MyItems({
  state,
  setState,
  activeCircleId,
}: {
  state: State;
  setState: React.Dispatch<React.SetStateAction<State>>;
  activeCircleId: string;
}) {
  const myItems = state.items.filter(
    (i) => i.ownerId === state.user.id && i.circleId === activeCircleId
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [rv, setRv] = useState("");
  const [avail, setAvail] = useState("");
  const [category, setCategory] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const openNew = () => {
    setEditing(null);
    setTitle("");
    setNote("");
    setRv("");
    setAvail("");
    setCategory("");
    setFiles([]);
    setErrors({});
    setOpen(true);
  };

  const openEdit = (item: Item) => {
    setEditing(item);
    setTitle(item.title);
    setNote(item.note || "");
    setRv(item.rv ? String(item.rv) : "");
    setAvail(item.avail || "");
    setCategory(item.category || "");
    setFiles([]);
    setErrors({});
    setOpen(true);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Title is required";
    if (rv && (isNaN(Number(rv)) || Number(rv) < 0))
      newErrors.rv = "Must be a positive number";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveItem = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      let photos: string[] = editing ? editing.photos : [];
      if (files.length > 0) photos = await filesTo64(files.slice(0, 3));
      if (editing) {
        const updated: Item = {
          ...editing,
          title: title.trim(),
          note: note.trim() || undefined,
          rv: rv ? Number(rv) : undefined,
          avail: avail.trim() || undefined,
          category: category.trim() || undefined,
          photos,
        };
        setState((s) => ({
          ...s,
          items: s.items.map((i) => (i.id === editing.id ? updated : i)),
        }));
        setToast({ message: `"${title}" updated successfully`, type: "success" });
      } else {
        const newItem: Item = {
          id: uid(),
          ownerId: state.user.id,
          circleId: activeCircleId,
          title: title.trim(),
          note: note.trim() || undefined,
          rv: rv ? Number(rv) : undefined,
          avail: avail.trim() || undefined,
          category: category.trim() || undefined,
          photos,
          createdAt: now(),
        };
        setState((s) => ({ ...s, items: [newItem, ...s.items] }));
        setToast({ message: `"${title}" added to your tools`, type: "success" });
      }
      setOpen(false);
    } catch {
      setToast({ message: "Failed to save item. Please try again.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = () => {
    if (editing) {
      setState((s) => ({
        ...s,
        items: s.items.filter((i) => i.id !== editing.id),
        requests: s.requests.filter((r) => r.itemId !== editing.id),
      }));
      setToast({ message: `"${editing.title}" deleted`, type: "success" });
      setOpen(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Your Items</h3>
          <p className="text-xs text-gray-500">
            {myItems.length} {myItems.length === 1 ? "tool" : "tools"} shared
          </p>
        </div>
        <Button onClick={openNew}>+ Add Item</Button>
      </div>

      {myItems.length === 0 && (
        <EmptyState
          icon={
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
          title="No items yet"
          description="Add your first tool to share it with your circle."
          action={<Button onClick={openNew}>+ Add Your First Tool</Button>}
        />
      )}

      {myItems.map((item) => (
        <Card key={item.id}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 min-w-0">
              <ItemPhoto src={item.photos[0]} alt={item.title} />
              <div className="min-w-0">
                <div className="font-medium truncate">{item.title}</div>
                {item.category && (
                  <div className="text-xs text-gray-400">{item.category}</div>
                )}
                {item.rv != null && (
                  <div className="text-xs text-gray-400">
                    RV: ${item.rv}
                  </div>
                )}
              </div>
            </div>
            <Button kind="secondary" onClick={() => openEdit(item)}>
              Edit
            </Button>
          </div>
        </Card>
      ))}

      {open && (
        <Modal
          title={editing ? "Edit Item" : "Add Item"}
          onClose={() => setOpen(false)}
        >
          <FormField label="Title" error={errors.title}>
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: "" }));
              }}
              placeholder="e.g., Cordless Drill"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              autoFocus
            />
          </FormField>
          <FormField label="Category">
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Power Tools"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </FormField>
          <FormField label="Notes">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Condition, accessories, usage tips…"
              rows={2}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500 resize-none"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Replacement Value ($)" error={errors.rv}>
              <input
                type="number"
                min="0"
                value={rv}
                onChange={(e) => {
                  setRv(e.target.value);
                  if (errors.rv) setErrors((prev) => ({ ...prev, rv: "" }));
                }}
                placeholder="0"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </FormField>
            <FormField label="Availability">
              <input
                value={avail}
                onChange={(e) => setAvail(e.target.value)}
                placeholder="e.g., Weekends"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </FormField>
          </div>
          <FormField label="Photos (up to 3)">
            <input
              multiple
              type="file"
              accept="image/*"
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
              className="text-sm text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-800 file:px-3 file:py-2 file:text-sm file:text-gray-300 hover:file:bg-gray-700"
            />
          </FormField>
          <div className="flex gap-2 pt-1">
            <Button onClick={saveItem} disabled={saving}>
              {saving ? "Saving…" : editing ? "Update" : "Save"}
            </Button>
            {editing && (
              <Button kind="danger" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            )}
          </div>
        </Modal>
      )}

      {confirmDelete && editing && (
        <ConfirmDialog
          title="Delete Item"
          message={`Are you sure you want to delete "${editing.title}"? This will also remove any pending requests for this item.`}
          confirmLabel="Delete"
          onConfirm={deleteItem}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
