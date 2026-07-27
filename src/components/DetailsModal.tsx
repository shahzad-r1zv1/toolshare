"use client";

import React, { useState, useMemo } from "react";
import { Button, Modal, Toast, FormField } from "./ui";
import { uid, now, findOutstandingLoan, distanceLabel, rentalCost } from "@/lib/helpers";
import type { State, Item, WaitlistEntry } from "@/lib/types";

export function DetailsModal({
  state,
  setState,
  item,
  isOwnItem,
  onClose,
  onRequest,
}: {
  state: State;
  setState: React.Dispatch<React.SetStateAction<State>>;
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
    type: "error" | "success";
  } | null>(null);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const you = state.user.id;
  const isOutstanding = Boolean(findOutstandingLoan(state.loans, item.id));
  const waitlistEntries = state.waitlist.filter((w) => w.itemId === item.id);
  const onWaitlist = waitlistEntries.some((w) => w.requesterId === you);
  const owner = [state.user, ...state.friends].find((u) => u.id === item.ownerId);
  const distance = isOwnItem ? undefined : distanceLabel(state.user.location, owner?.location);

  const joinWaitlist = () => {
    const entry: WaitlistEntry = {
      id: uid(),
      itemId: item.id,
      requesterId: you,
      createdAt: now(),
    };
    setState((s) => ({ ...s, waitlist: [...s.waitlist, entry] }));
    setToast({ message: `Added to the waitlist for "${item.title}"`, type: "success" });
  };

  const leaveWaitlist = () => {
    setState((s) => ({
      ...s,
      waitlist: s.waitlist.filter((w) => !(w.itemId === item.id && w.requesterId === you)),
    }));
  };

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
            className="rounded-2xl max-h-48 w-full object-cover border-2 border-border"
          />
        )}

        <div className="space-y-2">
          {item.category && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-faint uppercase tracking-wide">Category</span>
              <span className="text-sm text-ink-muted">{item.category}</span>
            </div>
          )}
          {item.note && (
            <div>
              <span className="text-xs text-ink-faint uppercase tracking-wide block mb-0.5">Notes</span>
              <p className="text-sm text-ink-muted">{item.note}</p>
            </div>
          )}
          {item.rv != null && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-faint uppercase tracking-wide">Replacement Value</span>
              <span className="text-sm text-ink-muted font-tag">${item.rv}</span>
            </div>
          )}
          {item.avail && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-faint uppercase tracking-wide">Availability</span>
              <span className="text-sm text-ink-muted">{item.avail}</span>
            </div>
          )}
          {item.rate && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-faint uppercase tracking-wide">Rental Rate</span>
              <span className="text-sm text-ink-muted font-tag">
                ${item.rate.amount}
                {item.rate.unit === "day" ? "/day" : " flat"}
              </span>
            </div>
          )}
          {distance && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-faint uppercase tracking-wide">Distance</span>
              <span className="text-sm text-ink-muted">{distance}</span>
            </div>
          )}
        </div>

        {!isOwnItem && isOutstanding && (
          <div className="border-t border-border pt-3 mt-1 space-y-2">
            <p className="text-sm text-ink-muted">
              This tool is out right now.{" "}
              {waitlistEntries.length > 0 &&
                `${waitlistEntries.length} ${waitlistEntries.length === 1 ? "person is" : "people are"} already waiting.`}
            </p>
            {onWaitlist ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-tag uppercase text-teal bg-teal-soft border-2 border-teal/40 px-2 py-1 rounded-full">
                  You&apos;re on the waitlist
                </span>
                <Button kind="ghost" onClick={leaveWaitlist}>
                  Leave waitlist
                </Button>
              </div>
            ) : (
              <Button onClick={joinWaitlist}>Join Waitlist</Button>
            )}
          </div>
        )}

        {!isOwnItem && !isOutstanding && (
          <>
            <div className="border-t border-border pt-3 mt-1">
              <p className="text-sm text-ink-muted mb-2">
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
                    className="w-full px-3 py-2 bg-surface-sunken border-2 border-border rounded-2xl text-sm text-ink focus:outline-none focus:border-accent"
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
                    className="w-full px-3 py-2 bg-surface-sunken border-2 border-border rounded-2xl text-sm text-ink focus:outline-none focus:border-accent"
                  />
                </FormField>
              </div>
              {item.rate && start && end && end >= start && (
                <p className="text-sm text-teal font-tag mt-2">
                  Estimated cost: ${rentalCost(item.rate, start, end).toFixed(2)}
                </p>
              )}
            </div>
            <Button onClick={handleRequest}>Request Tool</Button>
          </>
        )}

        {isOwnItem && (
          <p className="text-sm text-ink-faint italic text-center py-2">
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
