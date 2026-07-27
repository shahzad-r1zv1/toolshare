"use client";

import React, { useState } from "react";
import { Button, Card, Modal, EmptyState, ItemPhoto, Toast, Celebration } from "./ui";
import { MessageButton } from "./MessageThread";
import { uid, now, filesTo64, DATE_FMT, findOutstandingLoan, dueStatus, rentalCost } from "@/lib/helpers";
import type { State, Request, Loan, Message } from "@/lib/types";

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

  // Due-date digest (D-1/D/D+1): surfaces loans this user is involved in
  // that are overdue, due today, or due tomorrow, regardless of search/filter.
  const dueSoonLoans = state.loans
    .filter((l) => l.status === "ACTIVE")
    .filter((l) => {
      const item = findItem(l.itemId);
      return l.borrowerId === you || item?.ownerId === you;
    })
    .map((l) => ({ loan: l, status: dueStatus(l.endDate) }))
    .filter((x) => x.status !== "ok")
    .sort((a, b) => a.loan.endDate.localeCompare(b.loan.endDate));

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  const approve = (r: Request) => {
    const item = findItem(r.itemId);

    if (r.renewLoanId) {
      // Renewal: extend the existing loan's due date instead of creating a
      // new one. Still guard against the extended window colliding with a
      // different loan on the same item.
      const conflict = state.loans.find(
        (l) =>
          l.id !== r.renewLoanId &&
          l.itemId === r.itemId &&
          l.status === "ACTIVE" &&
          l.startDate <= r.endDate &&
          r.startDate <= l.endDate
      );
      if (conflict) {
        setToast({
          message: `Can't extend — "${item?.title}" is already booked ${DATE_FMT(
            conflict.startDate
          )} → ${DATE_FMT(conflict.endDate)}.`,
          type: "error",
        });
        return;
      }
      setState((s) => ({
        ...s,
        requests: s.requests.map((x) =>
          x.id === r.id ? { ...x, status: "APPROVED" as const } : x
        ),
        loans: s.loans.map((l) =>
          l.id === r.renewLoanId
            ? {
                ...l,
                endDate: r.endDate,
                renewalRequestId: undefined,
                cost: l.rate ? rentalCost(l.rate, l.startDate, r.endDate) : l.cost,
              }
            : l
        ),
      }));
      setToast({
        message: `Extended "${item?.title}" until ${DATE_FMT(r.endDate)}`,
        type: "success",
      });
      setCelebrate(true);
      return;
    }

    // Blocks on ANY outstanding (never-returned) loan for this item,
    // regardless of whether the new request's dates happen to overlap —
    // closes the gap where a late/never-returned tool could still be
    // approved for someone else's future dates while still out.
    const conflict = findOutstandingLoan(state.loans, r.itemId);
    if (conflict) {
      setToast({
        message: `Can't approve — "${item?.title}" is still out, due back ${DATE_FMT(
          conflict.endDate
        )}. Mark it returned first.`,
        type: "error",
      });
      return;
    }
    const loan: Loan = {
      id: uid(),
      itemId: r.itemId,
      itemTitle: item?.title || "Deleted item",
      itemCategory: item?.category,
      borrowerId: r.borrowerId,
      startDate: r.startDate,
      endDate: r.endDate,
      status: "ACTIVE",
      returnPhotos: [],
      rate: item?.rate,
      cost: item?.rate ? rentalCost(item.rate, r.startDate, r.endDate) : undefined,
    };
    setState((s) => ({
      ...s,
      requests: s.requests.map((x) =>
        x.id === r.id ? { ...x, status: "APPROVED" as const } : x
      ),
      loans: [loan, ...s.loans],
      // The new borrower no longer needs to wait for this item.
      waitlist: s.waitlist.filter(
        (w) => !(w.itemId === r.itemId && w.requesterId === r.borrowerId)
      ),
    }));
    setToast({
      message: `Approved request for "${item?.title}"`,
      type: "success",
    });
    setCelebrate(true);
  };

  const decline = (r: Request) => {
    setState((s) => ({
      ...s,
      requests: s.requests.map((x) =>
        x.id === r.id ? { ...x, status: "DECLINED" as const } : x
      ),
      loans: r.renewLoanId
        ? s.loans.map((l) =>
            l.id === r.renewLoanId ? { ...l, renewalRequestId: undefined } : l
          )
        : s.loans,
    }));
    const item = findItem(r.itemId);
    setToast({
      message: r.renewLoanId
        ? `Extension request declined for "${item?.title}"`
        : `Declined request for "${item?.title}"`,
      type: "info",
    });
  };

  const markPaid = (loan: Loan) => {
    setState((s) => ({
      ...s,
      loans: s.loans.map((l) => (l.id === loan.id ? { ...l, paid: true } : l)),
    }));
    const title = findItem(loan.itemId)?.title ?? loan.itemTitle;
    setToast({ message: `Marked "${title}" as paid`, type: "success" });
  };

  const requestRenewal = (loan: Loan, newEndDate: string) => {
    const req: Request = {
      id: uid(),
      itemId: loan.itemId,
      borrowerId: loan.borrowerId,
      startDate: loan.startDate,
      endDate: newEndDate,
      status: "PENDING",
      createdAt: Date.now(),
      renewLoanId: loan.id,
    };
    setState((s) => ({
      ...s,
      requests: [req, ...s.requests],
      loans: s.loans.map((l) =>
        l.id === loan.id ? { ...l, renewalRequestId: req.id } : l
      ),
    }));
    setToast({
      message: `Extension requested until ${DATE_FMT(newEndDate)}`,
      type: "success",
    });
  };

  const nudge = (l: Loan) => {
    const title = findItem(l.itemId)?.title ?? l.itemTitle;
    const borrower = findUser(l.borrowerId);
    const message: Message = {
      id: uid(),
      threadId: l.id,
      senderId: you,
      text: `Hey! Just checking in on "${title}" — could you return it when you get a chance?`,
      createdAt: now(),
    };
    setState((s) => ({ ...s, messages: [...s.messages, message] }));
    setToast({
      message: `Nudge sent to ${borrower?.name || "the borrower"} about "${title}" 👋`,
      type: "info",
    });
  };

  const [returning, setReturning] = useState<Loan | null>(null);
  const [returnNotes, setReturnNotes] = useState("");
  const [returnFiles, setReturnFiles] = useState<File[]>([]);

  const [renewing, setRenewing] = useState<Loan | null>(null);
  const [renewDate, setRenewDate] = useState("");

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
              returnedAt: now(),
              ownerConfirmedReturn: true,
            }
          : x
      ),
    }));
    const title = findItem(returning.itemId)?.title ?? returning.itemTitle;
    const waiting = state.waitlist.filter((w) => w.itemId === returning.itemId);
    setToast({
      message:
        waiting.length > 0
          ? `"${title}" marked as returned — ${waiting.length} ${
              waiting.length === 1 ? "person is" : "people are"
            } waiting for it`
          : `"${title}" marked as returned`,
      type: "success",
    });
    setCelebrate(true);
    setReturning(null);
    setReturnNotes("");
    setReturnFiles([]);
  };

  const hasNoContent =
    incoming.length === 0 && outgoing.length === 0 && active.length === 0;

  return (
    <div className="space-y-6">
      {dueSoonLoans.length > 0 && (
        <div className="relative rounded-3xl border-2 border-warn/40 bg-warn-soft p-4 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] kit-edge" />
          <h3 className="font-display font-bold text-sm text-warn mb-2 pt-0.5 flex items-center gap-1.5 uppercase tracking-wide">
            ⏰ Due Soon
          </h3>
          <ul className="space-y-1.5">
            {dueSoonLoans.map(({ loan, status }) => {
              const title = findItem(loan.itemId)?.title ?? loan.itemTitle;
              const iAmBorrower = loan.borrowerId === you;
              const label =
                status === "overdue"
                  ? "Overdue"
                  : status === "due-today"
                  ? "Due today"
                  : "Due tomorrow";
              return (
                <li key={loan.id} className="text-sm text-ink flex items-center justify-between gap-2">
                  <span className="truncate">
                    <b>{title}</b>
                    {iAmBorrower ? " — you have it" : " — you lent it"}
                  </span>
                  <span
                    className={`text-xs shrink-0 px-2 py-0.5 rounded-full font-tag uppercase ${
                      status === "overdue"
                        ? "bg-bad text-accent-ink"
                        : "bg-warn text-accent-ink"
                    }`}
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

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
          <h3 className="font-display font-bold text-lg mb-3 flex items-center gap-2 text-ink">
            Incoming Requests
            <span className="text-xs font-tag bg-accent text-accent-ink px-2 py-0.5 rounded-full">
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
                        {r.renewLoanId ? (
                          <>
                            <b>{borrower?.name}</b> wants to extend{" "}
                            <b>{item?.title}</b>
                          </>
                        ) : (
                          <>
                            <b>{borrower?.name}</b> wants <b>{item?.title}</b>
                          </>
                        )}
                      </div>
                      <div className="text-xs text-ink-muted">
                        {r.renewLoanId
                          ? `New due date: ${DATE_FMT(r.endDate)}`
                          : `${DATE_FMT(r.startDate)} → ${DATE_FMT(r.endDate)}`}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <MessageButton
                        state={state}
                        setState={setState}
                        threadId={r.id}
                        otherPartyName={borrower?.name || "them"}
                      />
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
          <h3 className="font-display font-bold text-lg mb-3 text-ink">Outgoing Requests</h3>
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
                        Waiting on <b>{owner?.name}</b> to{" "}
                        {r.renewLoanId ? "approve extending" : "approve"}{" "}
                        <b>{item?.title}</b>
                      </div>
                      <div className="text-xs text-ink-muted">
                        {r.renewLoanId
                          ? `New due date: ${DATE_FMT(r.endDate)}`
                          : `${DATE_FMT(r.startDate)} → ${DATE_FMT(r.endDate)}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <MessageButton
                        state={state}
                        setState={setState}
                        threadId={r.id}
                        otherPartyName={owner?.name || "them"}
                      />
                      <span className="text-xs font-tag uppercase text-warn bg-warn-soft border-2 border-warn/30 px-2 py-1 rounded-full">
                        Pending
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {active.length > 0 && (
        <section>
          <h3 className="font-display font-bold text-lg mb-3 flex items-center gap-2 text-ink">
            Active Loans
            <span className="text-xs font-tag bg-teal text-teal-ink px-2 py-0.5 rounded-full">
              {active.length}
            </span>
          </h3>
          <div className="space-y-3">
            {active.map((l) => {
              const item = findItem(l.itemId);
              const title = item?.title ?? l.itemTitle;
              const borrower = findUser(l.borrowerId);
              const iOwnThisItem = item?.ownerId === you;
              const status = dueStatus(l.endDate);
              const dueLabelClass =
                status === "overdue"
                  ? "text-bad font-medium"
                  : status === "due-today"
                  ? "text-warn font-medium"
                  : status === "due-soon"
                  ? "text-warn"
                  : "text-ink-muted";
              const dueSuffix =
                status === "overdue"
                  ? " • Overdue"
                  : status === "due-today"
                  ? " • Due today"
                  : status === "due-soon"
                  ? " • Due tomorrow"
                  : "";
              return (
                <Card key={l.id}>
                  <div
                    className={`flex items-center gap-3 ${
                      status === "overdue" ? "-m-4 p-4 rounded-3xl bg-bad-soft" : ""
                    }`}
                  >
                    <ItemPhoto src={item?.photos[0]} alt={title} />
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-ink">
                        <b>{title}</b> borrowed by{" "}
                        <b>{borrower?.name}</b>
                      </div>
                      <div className={`text-xs ${dueLabelClass}`}>
                        {status === "overdue" && "🔥 "}
                        Due {DATE_FMT(l.endDate)}
                        {dueSuffix}
                        {l.renewalRequestId && " • Extension pending"}
                      </div>
                      {l.cost != null && (
                        <div className="text-xs text-teal font-tag">
                          ${l.cost.toFixed(2)} {l.paid ? "· paid" : "· unpaid"}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <MessageButton
                        state={state}
                        setState={setState}
                        threadId={l.id}
                        otherPartyName={
                          (iOwnThisItem ? borrower?.name : findUser(item?.ownerId || "")?.name) ||
                          "them"
                        }
                      />
                      {l.cost != null && !l.paid && (
                        <Button kind="ghost" onClick={() => markPaid(l)}>
                          Mark Paid
                        </Button>
                      )}
                      {iOwnThisItem && status === "overdue" && (
                        <Button kind="secondary" onClick={() => nudge(l)}>
                          Nudge
                        </Button>
                      )}
                      {!iOwnThisItem && !l.renewalRequestId && (
                        <Button
                          kind="secondary"
                          onClick={() => {
                            setRenewing(l);
                            setRenewDate(l.endDate);
                          }}
                        >
                          Request Extension
                        </Button>
                      )}
                      {iOwnThisItem && (
                        <Button onClick={() => setReturning(l)}>
                          Mark Returned
                        </Button>
                      )}
                    </div>
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
          <p className="text-sm text-ink-muted">
            Confirm that{" "}
            <b className="text-ink">{findItem(returning.itemId)?.title ?? returning.itemTitle}</b> has been
            returned.
          </p>
          <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">
            Return Notes (optional)
          </label>
          <textarea
            value={returnNotes}
            onChange={(e) => setReturnNotes(e.target.value)}
            placeholder="Condition, any issues…"
            rows={2}
            className="w-full px-3 py-2 bg-surface-sunken border-2 border-border rounded-2xl text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent resize-none"
          />
          <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">
            Return Photos (optional)
          </label>
          <input
            multiple
            type="file"
            accept="image/*"
            onChange={(e) =>
              setReturnFiles(Array.from(e.target.files || []))
            }
            className="text-sm text-ink-muted file:mr-3 file:rounded-full file:border-0 file:bg-surface-sunken file:px-3 file:py-2 file:text-sm file:text-ink file:font-bold hover:file:bg-surface-raised"
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

      {renewing && (
        <Modal title="Request Extension" onClose={() => setRenewing(null)}>
          <p className="text-sm text-ink-muted">
            Ask to keep{" "}
            <b className="text-ink">{findItem(renewing.itemId)?.title ?? renewing.itemTitle}</b>{" "}
            past its current due date of {DATE_FMT(renewing.endDate)}.
          </p>
          <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">
            New Due Date
          </label>
          <input
            type="date"
            min={renewing.endDate}
            value={renewDate}
            onChange={(e) => setRenewDate(e.target.value)}
            className="w-full px-3 py-2 bg-surface-sunken border-2 border-border rounded-2xl text-sm text-ink focus:outline-none focus:border-accent"
          />
          <div className="flex gap-2 pt-1">
            <Button
              onClick={() => {
                if (!renewDate || renewDate <= renewing.endDate) return;
                requestRenewal(renewing, renewDate);
                setRenewing(null);
              }}
              disabled={!renewDate || renewDate <= renewing.endDate}
            >
              Send Request
            </Button>
            <Button kind="secondary" onClick={() => setRenewing(null)}>
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

      {celebrate && <Celebration onDone={() => setCelebrate(false)} />}
    </div>
  );
}
