"use client";

import React, { useState } from "react";
import { Button, Card, Modal, EmptyState, ItemPhoto, Toast } from "./ui";
import { uid, filesTo64, DATE_FMT } from "@/lib/helpers";
import type { State, Request, Loan } from "@/lib/types";

export function Requests({
  state,
  setState,
  search,
  filter,
}: {
  state: State;
  setState: React.Dispatch<React.SetStateAction<State>>;
  search: string;
  filter: string;
}) {
  const you = state.user.id;
  const myItemIds = new Set(
    state.items.filter((i) => i.ownerId === you).map((i) => i.id)
  );
  const findItem = (id: string) => state.items.find((i) => i.id === id);
  const findUser = (id: string) =>
    [state.user, ...state.friends].find((u) => u.id === id);

  const matchesFilter = (r: { itemId: string }) => {
    const it = findItem(r.itemId);
    if (!it) return false;
    return (
      it.title.toLowerCase().includes(search.toLowerCase()) &&
      (!filter || it.category === filter)
    );
  };

  const incoming = state.requests
    .filter((r) => myItemIds.has(r.itemId) && r.status === "PENDING")
    .filter(matchesFilter);
  const outgoing = state.requests
    .filter((r) => r.borrowerId === you && r.status === "PENDING")
    .filter(matchesFilter);
  const active = state.loans
    .filter((l) => l.status === "ACTIVE")
    .filter(matchesFilter);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const approve = (r: Request) => {
    const loan: Loan = {
      id: uid(),
      itemId: r.itemId,
      borrowerId: r.borrowerId,
      startDate: r.startDate,
      endDate: r.endDate,
      status: "ACTIVE",
      returnPhotos: [],
    };
    setState((s) => ({
      ...s,
      requests: s.requests.map((x) =>
        x.id === r.id ? { ...x, status: "APPROVED" as const } : x
      ),
      loans: [loan, ...s.loans],
    }));
    const item = findItem(r.itemId);
    setToast({
      message: `Approved request for "${item?.title}"`,
      type: "success",
    });
  };

  const decline = (r: Request) => {
    setState((s) => ({
      ...s,
      requests: s.requests.map((x) =>
        x.id === r.id ? { ...x, status: "DECLINED" as const } : x
      ),
    }));
    const item = findItem(r.itemId);
    setToast({
      message: `Declined request for "${item?.title}"`,
      type: "info",
    });
  };

  const [returning, setReturning] = useState<Loan | null>(null);
  const [returnNotes, setReturnNotes] = useState("");
  const [returnFiles, setReturnFiles] = useState<File[]>([]);

  const markReturned = async () => {
    if (!returning) return;
    const photos = await filesTo64(returnFiles.slice(0, 3));
    setState((s) => ({
      ...s,
      loans: s.loans.map((x) =>
        x.id === returning.id
          ? {
              ...x,
              status: "RETURNED" as const,
              returnNotes: returnNotes.trim() || undefined,
              returnPhotos: photos,
            }
          : x
      ),
    }));
    const item = findItem(returning.itemId);
    setToast({
      message: `"${item?.title}" marked as returned`,
      type: "success",
    });
    setReturning(null);
    setReturnNotes("");
    setReturnFiles([]);
  };

  const hasNoContent =
    incoming.length === 0 && outgoing.length === 0 && active.length === 0;

  return (
    <div className="space-y-6">
      {hasNoContent && !search && !filter && (
        <EmptyState
          icon={
            <svg
              className="w-12 h-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
          }
          title="No requests or active loans"
          description="When someone requests a tool from you, or you request one, it will appear here."
        />
      )}

      {hasNoContent && (search || filter) && (
        <EmptyState
          icon={
            <svg
              className="w-12 h-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          }
          title="No matching requests"
          description="Try adjusting your search or filters."
        />
      )}

      {incoming.length > 0 && (
        <section>
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            Incoming Requests
            <span className="text-xs font-normal bg-emerald-900 text-emerald-300 px-2 py-0.5 rounded-full">
              {incoming.length}
            </span>
          </h3>
          <div className="space-y-3">
            {incoming.map((r) => {
              const item = findItem(r.itemId);
              const borrower = findUser(r.borrowerId);
              return (
                <Card key={r.id}>
                  <div className="flex items-center gap-3">
                    <ItemPhoto src={item?.photos[0]} alt={item?.title || ""} />
                    <div className="flex-1 min-w-0">
                      <div className="truncate">
                        <b>{borrower?.name}</b> wants <b>{item?.title}</b>
                      </div>
                      <div className="text-xs text-gray-400">
                        {DATE_FMT(r.startDate)} → {DATE_FMT(r.endDate)}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button onClick={() => approve(r)}>Approve</Button>
                      <Button kind="secondary" onClick={() => decline(r)}>
                        Decline
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {outgoing.length > 0 && (
        <section>
          <h3 className="font-semibold text-lg mb-3">Outgoing Requests</h3>
          <div className="space-y-3">
            {outgoing.map((r) => {
              const item = findItem(r.itemId);
              const owner = findUser(item?.ownerId || "");
              return (
                <Card key={r.id}>
                  <div className="flex items-center gap-3">
                    <ItemPhoto src={item?.photos[0]} alt={item?.title || ""} />
                    <div className="flex-1 min-w-0">
                      <div className="truncate">
                        Waiting on <b>{owner?.name}</b> to approve{" "}
                        <b>{item?.title}</b>
                      </div>
                      <div className="text-xs text-gray-400">
                        {DATE_FMT(r.startDate)} → {DATE_FMT(r.endDate)}
                      </div>
                    </div>
                    <span className="text-xs text-yellow-400 bg-yellow-900/30 px-2 py-1 rounded-lg shrink-0">
                      Pending
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {active.length > 0 && (
        <section>
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            Active Loans
            <span className="text-xs font-normal bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">
              {active.length}
            </span>
          </h3>
          <div className="space-y-3">
            {active.map((l) => {
              const item = findItem(l.itemId);
              const borrower = findUser(l.borrowerId);
              const iOwnThisItem = item?.ownerId === you;
              const overdue = new Date(l.endDate) < new Date();
              return (
                <Card key={l.id}>
                  <div className="flex items-center gap-3">
                    <ItemPhoto src={item?.photos[0]} alt={item?.title || ""} />
                    <div className="flex-1 min-w-0">
                      <div className="truncate">
                        <b>{item?.title}</b> borrowed by{" "}
                        <b>{borrower?.name}</b>
                      </div>
                      <div
                        className={`text-xs ${
                          overdue ? "text-red-400 font-medium" : "text-gray-400"
                        }`}
                      >
                        Due {DATE_FMT(l.endDate)}
                        {overdue && " • Overdue"}
                      </div>
                    </div>
                    {iOwnThisItem && (
                      <Button onClick={() => setReturning(l)}>
                        Mark Returned
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {returning && (
        <Modal
          title="Complete Return"
          onClose={() => setReturning(null)}
        >
          <p className="text-sm text-gray-400">
            Confirm that{" "}
            <b>{findItem(returning.itemId)?.title}</b> has been
            returned.
          </p>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Return Notes (optional)
          </label>
          <textarea
            value={returnNotes}
            onChange={(e) => setReturnNotes(e.target.value)}
            placeholder="Condition, any issues…"
            rows={2}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500 resize-none"
          />
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Return Photos (optional)
          </label>
          <input
            multiple
            type="file"
            accept="image/*"
            onChange={(e) =>
              setReturnFiles(Array.from(e.target.files || []))
            }
            className="text-sm text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-800 file:px-3 file:py-2 file:text-sm file:text-gray-300 hover:file:bg-gray-700"
          />
          <div className="flex gap-2 pt-1">
            <Button onClick={markReturned}>Confirm Return</Button>
            <Button
              kind="secondary"
              onClick={() => setReturning(null)}
            >
              Cancel
            </Button>
          </div>
        </Modal>
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
