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
import { uid, now, filesTo64, formatAvailability, hasAvailability } from "@/lib/helpers";
import { DAYS_OF_WEEK, TIME_SLOTS } from "@/lib/types";
import type { State, Item, Availability, DayOfWeek, TimeSlot } from "@/lib/types";

const inputClass =
  "w-full px-3 py-2 bg-surface-sunken border-2 border-border rounded-2xl text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent";

function AvailabilityPicker({
  value,
  onChange,
}: {
  value: Availability;
  onChange: (next: Availability) => void;
}) {
  const toggle = (day: DayOfWeek, slot: TimeSlot) => {
    const current = value[day] || [];
    const next = current.includes(slot)
      ? current.filter((s) => s !== slot)
      : [...current, slot];
    onChange({ ...value, [day]: next.length > 0 ? next : undefined });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-separate border-spacing-1">
        <thead>
          <tr>
            <th className="w-16" />
            {DAYS_OF_WEEK.map((day) => (
              <th key={day} className="text-ink-muted font-bold pb-1">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TIME_SLOTS.map((slot) => (
            <tr key={slot}>
              <td className="text-ink-faint font-tag pr-2 whitespace-nowrap">{slot}</td>
              {DAYS_OF_WEEK.map((day) => {
                const active = (value[day] || []).includes(slot);
                return (
                  <td key={day}>
                    <button
                      type="button"
                      onClick={() => toggle(day, slot)}
                      aria-pressed={active}
                      aria-label={`${slot} on ${day}`}
                      className={`w-9 h-8 rounded-lg border-2 transition-colors ${
                        active
                          ? "bg-teal border-border text-teal-ink"
                          : "bg-surface-sunken border-border text-ink-faint hover:text-ink"
                      }`}
                    >
                      {active ? "✓" : ""}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const STARTER_CATEGORIES = [
  "Power Tools",
  "Hand Tools",
  "Yard & Garden",
  "Kitchen",
  "Ladders",
  "Camping",
  "Cleaning",
  "Automotive",
];

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
    (i) => i.ownerId === state.user.id && i.circleId === activeCircleId && !i.archived
  );
  const myArchivedItems = state.items.filter(
    (i) => i.ownerId === state.user.id && i.circleId === activeCircleId && i.archived
  );
  const circleCategories = Array.from(
    new Set(
      state.items
        .filter((i) => i.circleId === activeCircleId && i.category)
        .map((i) => i.category as string)
    )
  );
  const categoryChips = Array.from(
    new Set([...circleCategories, ...STARTER_CATEGORIES])
  ).slice(0, 8);
  const hasActiveLoan = (itemId: string) =>
    state.loans.some((l) => l.itemId === itemId && l.status === "ACTIVE");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [rv, setRv] = useState("");
  const [availability, setAvailability] = useState<Availability>({});
  const [category, setCategory] = useState("");
  const [rateAmount, setRateAmount] = useState("");
  const [rateUnit, setRateUnit] = useState<"day" | "flat">("day");
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
    setAvailability({});
    setCategory("");
    setFiles([]);
    setRateAmount("");
    setRateUnit("day");
    setErrors({});
    setOpen(true);
  };

  const openEdit = (item: Item) => {
    setEditing(item);
    setTitle(item.title);
    setNote(item.note || "");
    setRv(item.rv ? String(item.rv) : "");
    setAvailability(item.availability || {});
    setCategory(item.category || "");
    setFiles([]);
    setRateAmount(item.rate ? String(item.rate.amount) : "");
    setRateUnit(item.rate?.unit || "day");
    setErrors({});
    setOpen(true);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Title is required";
    if (rv && (isNaN(Number(rv)) || Number(rv) < 0))
      newErrors.rv = "Must be a positive number";
    if (rateAmount && (isNaN(Number(rateAmount)) || Number(rateAmount) <= 0))
      newErrors.rateAmount = "Must be a positive number";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveItem = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      let photos: string[] = editing ? editing.photos : [];
      if (files.length > 0) photos = await filesTo64(files.slice(0, 3));
      const rate = rateAmount
        ? { amount: Number(rateAmount), unit: rateUnit }
        : undefined;
      if (editing) {
        const updated: Item = {
          ...editing,
          title: title.trim(),
          note: note.trim() || undefined,
          rv: rv ? Number(rv) : undefined,
          avail: undefined,
          availability: hasAvailability(availability) ? availability : undefined,
          category: category.trim() || undefined,
          photos,
          rate,
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
          availability: hasAvailability(availability) ? availability : undefined,
          category: category.trim() || undefined,
          photos,
          rate,
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
        waitlist: s.waitlist.filter((w) => w.itemId !== editing.id),
      }));
      setToast({ message: `"${editing.title}" deleted`, type: "success" });
      setOpen(false);
      setConfirmDelete(false);
    }
  };

  const archiveItem = () => {
    if (!editing) return;
    setState((s) => ({
      ...s,
      items: s.items.map((i) => (i.id === editing.id ? { ...i, archived: true } : i)),
      // Archiving retires the tool from circulation, so pending asks for it
      // and its waitlist no longer make sense — loan history is untouched.
      requests: s.requests.filter(
        (r) => r.itemId !== editing.id || r.status !== "PENDING"
      ),
      waitlist: s.waitlist.filter((w) => w.itemId !== editing.id),
    }));
    setToast({ message: `"${editing.title}" archived`, type: "success" });
    setOpen(false);
  };

  const unarchiveItem = (item: Item) => {
    setState((s) => ({
      ...s,
      items: s.items.map((i) => (i.id === item.id ? { ...i, archived: false } : i)),
    }));
    setToast({ message: `"${item.title}" is shared again`, type: "success" });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-lg text-ink">Your Items</h3>
          <p className="text-xs text-ink-muted">
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
                <div className="font-medium truncate text-ink">{item.title}</div>
                {item.category && (
                  <div className="text-xs text-ink-muted">{item.category}</div>
                )}
                {item.rv != null && (
                  <div className="text-xs text-ink-muted font-tag">
                    RV: ${item.rv}
                  </div>
                )}
                {item.rate && (
                  <div className="text-xs text-teal font-tag">
                    ${item.rate.amount}
                    {item.rate.unit === "day" ? "/day" : " flat"}
                  </div>
                )}
                {hasAvailability(item.availability) && (
                  <div className="text-xs text-ink-faint">
                    {formatAvailability(item.availability)}
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

      {myArchivedItems.length > 0 && (
        <div className="pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wide text-ink-faint mb-2">
            Archived ({myArchivedItems.length})
          </h4>
          <div className="space-y-3">
            {myArchivedItems.map((item) => (
              <Card key={item.id}>
                <div className="flex justify-between items-center opacity-70">
                  <div className="flex items-center gap-3 min-w-0">
                    <ItemPhoto src={item.photos[0]} alt={item.title} />
                    <div className="min-w-0">
                      <div className="font-medium truncate text-ink">{item.title}</div>
                      {item.category && (
                        <div className="text-xs text-ink-muted">{item.category}</div>
                      )}
                    </div>
                  </div>
                  <Button kind="secondary" onClick={() => unarchiveItem(item)}>
                    Unarchive
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

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
              className={inputClass}
              autoFocus
            />
          </FormField>
          <FormField label="Category">
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Power Tools"
              className={inputClass}
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {categoryChips.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-full border-2 transition-colors ${
                    category === c
                      ? "bg-accent border-border text-accent-ink"
                      : "bg-surface-sunken border-border text-ink-muted hover:text-ink"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </FormField>
          <FormField label="Notes">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Condition, accessories, usage tips…"
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </FormField>
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
              className={inputClass}
            />
          </FormField>
          <FormField label="Availability (optional)">
            <AvailabilityPicker value={availability} onChange={setAvailability} />
            <p className="text-xs text-ink-faint mt-1">
              Leave blank if it&apos;s available anytime. Tapping a cell toggles it.
            </p>
          </FormField>
          <FormField label="Rental Rate (optional)" error={errors.rateAmount}>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={rateAmount}
                onChange={(e) => {
                  setRateAmount(e.target.value);
                  if (errors.rateAmount) setErrors((prev) => ({ ...prev, rateAmount: "" }));
                }}
                placeholder="0.00"
                className={inputClass}
              />
              <select
                value={rateUnit}
                onChange={(e) => setRateUnit(e.target.value as "day" | "flat")}
                className={inputClass}
              >
                <option value="day">per day</option>
                <option value="flat">flat fee</option>
              </select>
            </div>
            <p className="text-xs text-ink-faint mt-1">
              Tracking only — settle up with the borrower yourselves; the app just shows the total.
            </p>
          </FormField>
          <FormField label="Photos (up to 3)">
            <input
              multiple
              type="file"
              accept="image/*"
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
              className="text-sm text-ink-muted file:mr-3 file:rounded-full file:border-0 file:bg-surface-sunken file:px-3 file:py-2 file:text-sm file:text-ink file:font-bold hover:file:bg-surface-raised"
            />
          </FormField>
          <div className="flex gap-2 pt-1 flex-wrap">
            <Button onClick={saveItem} disabled={saving}>
              {saving ? "Saving…" : editing ? "Update" : "Save"}
            </Button>
            {editing && (
              <Button
                kind="secondary"
                disabled={hasActiveLoan(editing.id)}
                onClick={archiveItem}
              >
                {hasActiveLoan(editing.id) ? "On loan — can't archive" : "Archive"}
              </Button>
            )}
            {editing && (
              <Button
                kind="danger"
                disabled={hasActiveLoan(editing.id)}
                onClick={() => setConfirmDelete(true)}
              >
                {hasActiveLoan(editing.id) ? "On loan — can't delete" : "Delete"}
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
