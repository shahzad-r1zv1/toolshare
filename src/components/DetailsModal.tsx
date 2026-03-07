"use client";

import React, { useState } from "react";
import { Button, Modal, Toast, FormField } from "./ui";
import type { Item } from "@/lib/types";

export function DetailsModal({
  item,
  isOwnItem,
  onClose,
  onRequest,
}: {
  item: Item;
  isOwnItem: boolean;
  onClose: () => void;
  onRequest: (start: string, end: string) => void;
}) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{
    message: string;
    type: "error";
  } | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!start) newErrors.start = "Start date is required";
    if (!end) newErrors.end = "End date is required";
    if (start && end && new Date(start) > new Date(end)) {
      newErrors.end = "End date must be on or after start date";
    }
    if (start && new Date(start) < new Date(today)) {
      newErrors.start = "Start date cannot be in the past";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRequest = () => {
    if (isOwnItem) {
      setToast({ message: "You cannot request your own item", type: "error" });
      return;
    }
    if (!validate()) return;
    onRequest(start, end);
  };

  return (
    <>
      <Modal title={item.title} onClose={onClose}>
        {item.photos[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.photos[0]}
            alt={item.title}
            className="rounded-xl max-h-48 w-full object-cover"
          />
        )}

        <div className="space-y-2">
          {item.category && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Category</span>
              <span className="text-sm text-gray-300">{item.category}</span>
            </div>
          )}
          {item.note && (
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide block mb-0.5">Notes</span>
              <p className="text-sm text-gray-300">{item.note}</p>
            </div>
          )}
          {item.rv != null && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Replacement Value</span>
              <span className="text-sm text-gray-300">${item.rv}</span>
            </div>
          )}
          {item.avail && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Availability</span>
              <span className="text-sm text-gray-300">{item.avail}</span>
            </div>
          )}
        </div>

        {!isOwnItem && (
          <>
            <div className="border-t border-gray-800 pt-3 mt-1">
              <p className="text-sm text-gray-400 mb-2">
                Request to borrow this tool:
              </p>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Start Date" error={errors.start}>
                  <input
                    type="date"
                    min={today}
                    value={start}
                    onChange={(e) => {
                      setStart(e.target.value);
                      if (errors.start)
                        setErrors((prev) => ({ ...prev, start: "" }));
                    }}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  />
                </FormField>
                <FormField label="End Date" error={errors.end}>
                  <input
                    type="date"
                    min={start || today}
                    value={end}
                    onChange={(e) => {
                      setEnd(e.target.value);
                      if (errors.end)
                        setErrors((prev) => ({ ...prev, end: "" }));
                    }}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  />
                </FormField>
              </div>
            </div>
            <Button onClick={handleRequest}>Request Tool</Button>
          </>
        )}

        {isOwnItem && (
          <p className="text-sm text-gray-500 italic text-center py-2">
            This is your own item
          </p>
        )}
      </Modal>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}
