"use client";

import React, { useState } from "react";
import { Button, Card, EmptyState, ItemPhoto, Modal, FormField, Toast } from "./ui";
import { DATE_FMT, now, uid, filesTo64 } from "@/lib/helpers";
import type { State, Loan, Request } from "@/lib/types";

export function LoanHistory({
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
  const findItem = (id: string) => state.items.find((i) => i.id === id);
  const findUser = (id: string) =>
    [state.user, ...state.friends].find((u) => u.id === id);

  const history = state.loans
    .filter((l) => l.status === "RETURNED")
    .filter((l) => {
      const it = findItem(l.itemId);
      const title = it?.title ?? l.itemTitle;
      const category = it?.category ?? l.itemCategory;
      return (
        title.toLowerCase().includes(search.toLowerCase()) &&
        (!filter || category === filter)
      );
    });

  const [disputing, setDisputing] = useState<Loan | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeFiles, setDisputeFiles] = useState<File[]>([]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" } | null>(null);

  const confirmReturn = (loan: Loan) => {
    setState((s) => ({
      ...s,
      loans: s.loans.map((l) =>
        l.id === loan.id ? { ...l, borrowerConfirmedReturn: true } : l
      ),
    }));
    setToast({ message: "Return confirmed — thanks!", type: "success" });
  };

  const submitDispute = async () => {
    if (!disputing || !disputeReason.trim()) return;
    const photos = await filesTo64(disputeFiles.slice(0, 3));
    setState((s) => ({
      ...s,
      loans: s.loans.map((l) =>
        l.id === disputing.id
          ? {
              ...l,
              dispute: {
                raisedBy: you,
                reason: disputeReason.trim(),
                photos,
                createdAt: now(),
              },
            }
          : l
      ),
    }));
    setToast({ message: "Issue reported to your circle.", type: "info" });
    setDisputing(null);
    setDisputeReason("");
    setDisputeFiles([]);
  };

  const markPaid = (loan: Loan) => {
    setState((s) => ({
      ...s,
      loans: s.loans.map((l) => (l.id === loan.id ? { ...l, paid: true } : l)),
    }));
    setToast({ message: "Marked as paid", type: "success" });
  };

  const resolveDispute = (loan: Loan) => {
    setState((s) => ({
      ...s,
      loans: s.loans.map((l) =>
        l.id === loan.id && l.dispute
          ? { ...l, dispute: { ...l.dispute, resolved: true } }
          : l
      ),
    }));
    setToast({ message: "Marked resolved.", type: "success" });
  };

  const borrowAgain = (loan: Loan) => {
    const item = findItem(loan.itemId);
    if (!item) {
      setToast({ message: "That item no longer exists.", type: "info" });
      return;
    }
    const req: Request = {
      id: uid(),
      itemId: item.id,
      borrowerId: you,
      startDate: loan.startDate,
      endDate: loan.endDate,
      status: "PENDING",
      createdAt: now(),
    };
    setState((s) => ({ ...s, requests: [req, ...s.requests] }));
    setToast({ message: `Requested "${item.title}" again`, type: "success" });
  };

  if (history.length === 0 && !search && !filter) {
    return (
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
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        }
        title="No loan history yet"
        description="Completed loans will appear here for your records."
      />
    );
  }

  if (history.length === 0) {
    return (
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
        title="No matching history"
        description="Try adjusting your search or filters."
      />
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-display font-bold text-lg text-ink">
        Loan History
        <span className="text-xs text-ink-faint font-tag ml-2">
          {history.length} {history.length === 1 ? "record" : "records"}
        </span>
      </h3>
      {history.map((l) => {
        const item = findItem(l.itemId);
        const title = item?.title ?? l.itemTitle;
        const borrower = findUser(l.borrowerId);
        const iAmBorrower = l.borrowerId === you;
        const iOwnThisItem = item?.ownerId === you;
        return (
          <Card key={l.id}>
            <div className="flex items-center gap-3">
              <ItemPhoto src={item?.photos[0]} alt={title} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-ink">
                  <b>{title}</b>
                  {!item && (
                    <span className="text-ink-faint italic"> (deleted)</span>
                  )}{" "}
                  was borrowed by <b>{borrower?.name}</b>
                </div>
                <div className="text-xs text-ink-muted">
                  {DATE_FMT(l.startDate)} → {DATE_FMT(l.endDate)}
                </div>
                {l.returnNotes && (
                  <div className="text-xs text-ink-muted mt-1">
                    Notes: {l.returnNotes}
                  </div>
                )}
                {l.cost != null && (
                  <div className="text-xs text-teal font-tag mt-1">
                    ${l.cost.toFixed(2)} {l.paid ? "· paid" : "· unpaid"}
                  </div>
                )}
                {l.dispute && (
                  <div
                    className={`text-xs mt-1 px-2 py-1 rounded-full inline-block border-2 ${
                      l.dispute.resolved
                        ? "bg-good-soft border-good/40 text-good"
                        : "bg-bad-soft border-bad/40 text-bad"
                    }`}
                  >
                    {l.dispute.resolved ? "Issue resolved: " : "⚠ Issue reported: "}
                    {l.dispute.reason}
                  </div>
                )}
                {iAmBorrower && !l.borrowerConfirmedReturn && (
                  <div className="text-xs text-warn mt-1">Awaiting your confirmation</div>
                )}
              </div>
              <div className="flex flex-col gap-1.5 shrink-0 items-end">
                {l.cost != null && !l.paid && (
                  <Button kind="ghost" onClick={() => markPaid(l)}>
                    Mark Paid
                  </Button>
                )}
                {iAmBorrower && !l.borrowerConfirmedReturn && (
                  <Button kind="secondary" onClick={() => confirmReturn(l)}>
                    Confirm Received Back
                  </Button>
                )}
                {item && iAmBorrower && (
                  <Button kind="ghost" onClick={() => borrowAgain(l)}>
                    Borrow Again
                  </Button>
                )}
                {!l.dispute && (iAmBorrower || iOwnThisItem) && (
                  <Button kind="ghost" onClick={() => setDisputing(l)}>
                    Report an Issue
                  </Button>
                )}
                {l.dispute && !l.dispute.resolved && iOwnThisItem && (
                  <Button kind="ghost" onClick={() => resolveDispute(l)}>
                    Mark Resolved
                  </Button>
                )}
              </div>
            </div>
          </Card>
        );
      })}

      {disputing && (
        <Modal title="Report an Issue" onClose={() => setDisputing(null)}>
          <p className="text-sm text-ink-muted">
            Let your circle know about a problem with{" "}
            <b className="text-ink">
              {findItem(disputing.itemId)?.title ?? disputing.itemTitle}
            </b>
            .
          </p>
          <FormField label="What happened?">
            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="e.g., Returned with a cracked handle"
              rows={3}
              className="w-full px-3 py-2 bg-surface-sunken border-2 border-border rounded-2xl text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent resize-none"
              autoFocus
            />
          </FormField>
          <FormField label="Photos (optional)">
            <input
              multiple
              type="file"
              accept="image/*"
              onChange={(e) => setDisputeFiles(Array.from(e.target.files || []))}
              className="text-sm text-ink-muted file:mr-3 file:rounded-full file:border-0 file:bg-surface-sunken file:px-3 file:py-2 file:text-sm file:text-ink file:font-bold hover:file:bg-surface-raised"
            />
          </FormField>
          <div className="flex gap-2 pt-1">
            <Button kind="danger" onClick={submitDispute} disabled={!disputeReason.trim()}>
              Report Issue
            </Button>
            <Button kind="secondary" onClick={() => setDisputing(null)}>
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
