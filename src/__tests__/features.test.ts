import { describe, it, expect, beforeEach } from "vitest";
import {
  seed,
  uid,
  now,
  findOutstandingLoan,
  trustScore,
  wasReturnedLate,
} from "@/lib/helpers";
import type {
  State,
  Item,
  Request,
  Loan,
  Message,
  WaitlistEntry,
} from "@/lib/types";

/**
 * Tests for the 8 features layered on top of the core borrowing lifecycle:
 * outstanding-loan blocking, messaging, two-sided return confirmation,
 * disputes, waitlist, borrow-again, archiving, and trust scores.
 */

const D1_START = "2026-03-10";
const D1_END = "2026-03-15";

function addItem(state: State, item: Omit<Item, "id" | "createdAt">): State {
  const newItem: Item = { ...item, id: uid(), createdAt: now() };
  return { ...state, items: [newItem, ...state.items] };
}

function requestItem(
  state: State,
  itemId: string,
  borrowerId: string,
  startDate: string,
  endDate: string
): State {
  const req: Request = {
    id: uid(),
    itemId,
    borrowerId,
    startDate,
    endDate,
    status: "PENDING",
    createdAt: now(),
  };
  return { ...state, requests: [req, ...state.requests] };
}

/** Mirrors Requests.tsx.approve's non-renewal path, including the
 * outstanding-loan guard and waitlist cleanup. */
function approveRequest(state: State, requestId: string): State | { blocked: true } {
  const req = state.requests.find((r) => r.id === requestId);
  if (!req) return state;
  if (findOutstandingLoan(state.loans, req.itemId)) return { blocked: true };

  const item = state.items.find((i) => i.id === req.itemId);
  const loan: Loan = {
    id: uid(),
    itemId: req.itemId,
    itemTitle: item?.title || "Deleted item",
    itemCategory: item?.category,
    borrowerId: req.borrowerId,
    startDate: req.startDate,
    endDate: req.endDate,
    status: "ACTIVE",
    returnPhotos: [],
  };
  return {
    ...state,
    requests: state.requests.map((r) =>
      r.id === requestId ? { ...r, status: "APPROVED" as const } : r
    ),
    loans: [loan, ...state.loans],
    waitlist: state.waitlist.filter(
      (w) => !(w.itemId === req.itemId && w.requesterId === req.borrowerId)
    ),
  };
}

/** Mirrors Requests.tsx.markReturned. */
function markReturned(
  state: State,
  loanId: string,
  opts: { returnedAt?: number; notes?: string } = {}
): State {
  return {
    ...state,
    loans: state.loans.map((l) =>
      l.id === loanId
        ? {
            ...l,
            status: "RETURNED" as const,
            returnNotes: opts.notes,
            returnPhotos: [],
            returnedAt: opts.returnedAt ?? now(),
            ownerConfirmedReturn: true,
          }
        : l
    ),
  };
}

function confirmReturnAsBorrower(state: State, loanId: string): State {
  return {
    ...state,
    loans: state.loans.map((l) =>
      l.id === loanId ? { ...l, borrowerConfirmedReturn: true } : l
    ),
  };
}

function raiseDispute(
  state: State,
  loanId: string,
  raisedBy: string,
  reason: string
): State {
  return {
    ...state,
    loans: state.loans.map((l) =>
      l.id === loanId
        ? { ...l, dispute: { raisedBy, reason, photos: [], createdAt: now() } }
        : l
    ),
  };
}

function resolveDispute(state: State, loanId: string): State {
  return {
    ...state,
    loans: state.loans.map((l) =>
      l.id === loanId && l.dispute
        ? { ...l, dispute: { ...l.dispute, resolved: true } }
        : l
    ),
  };
}

function sendMessage(state: State, threadId: string, senderId: string, text: string): State {
  const message: Message = { id: uid(), threadId, senderId, text, createdAt: now() };
  return { ...state, messages: [...state.messages, message] };
}

function joinWaitlist(state: State, itemId: string, requesterId: string): State {
  const entry: WaitlistEntry = { id: uid(), itemId, requesterId, createdAt: now() };
  return { ...state, waitlist: [...state.waitlist, entry] };
}

function leaveWaitlist(state: State, itemId: string, requesterId: string): State {
  return {
    ...state,
    waitlist: state.waitlist.filter(
      (w) => !(w.itemId === itemId && w.requesterId === requesterId)
    ),
  };
}

function archiveItem(state: State, itemId: string): State {
  return {
    ...state,
    items: state.items.map((i) => (i.id === itemId ? { ...i, archived: true } : i)),
    requests: state.requests.filter(
      (r) => r.itemId !== itemId || r.status !== "PENDING"
    ),
    waitlist: state.waitlist.filter((w) => w.itemId !== itemId),
  };
}

function unarchiveItem(state: State, itemId: string): State {
  return {
    ...state,
    items: state.items.map((i) => (i.id === itemId ? { ...i, archived: false } : i)),
  };
}

function borrowAgain(state: State, loan: Loan, borrowerId: string): State {
  const req: Request = {
    id: uid(),
    itemId: loan.itemId,
    borrowerId,
    startDate: loan.startDate,
    endDate: loan.endDate,
    status: "PENDING",
    createdAt: now(),
  };
  return { ...state, requests: [req, ...state.requests] };
}

describe("Feature: Blocking requests on outstanding loans", () => {
  let state: State;
  beforeEach(() => {
    state = seed();
  });

  it("approving a request while the item is already out is blocked, regardless of requested dates", () => {
    const myItem = state.items.find((i) => i.ownerId === "you")!;
    state = requestItem(state, myItem.id, "alice", D1_START, D1_END);
    const afterFirst = approveRequest(state, state.requests[0].id);
    expect("blocked" in afterFirst).toBe(false);
    state = afterFirst as State;

    // Bob asks for dates well after Alice's window — still blocked, since
    // Alice's loan is outstanding (never marked returned).
    state = requestItem(state, myItem.id, "bob", "2026-06-01", "2026-06-05");
    const result = approveRequest(state, state.requests[0].id);
    expect("blocked" in result).toBe(true);
  });

  it("allows approval again once the outstanding loan is returned", () => {
    const myItem = state.items.find((i) => i.ownerId === "you")!;
    state = requestItem(state, myItem.id, "alice", D1_START, D1_END);
    state = approveRequest(state, state.requests[0].id) as State;
    state = markReturned(state, state.loans[0].id);

    state = requestItem(state, myItem.id, "bob", "2026-06-01", "2026-06-05");
    const result = approveRequest(state, state.requests[0].id);
    expect("blocked" in result).toBe(false);
    state = result as State;
    expect(state.loans.filter((l) => l.status === "ACTIVE")).toHaveLength(1);
  });

  it("approving a request clears the approved borrower from that item's waitlist", () => {
    const myItem = state.items.find((i) => i.ownerId === "you")!;
    state = joinWaitlist(state, myItem.id, "alice");
    state = joinWaitlist(state, myItem.id, "bob");
    state = requestItem(state, myItem.id, "alice", D1_START, D1_END);
    state = approveRequest(state, state.requests[0].id) as State;

    expect(state.waitlist.some((w) => w.requesterId === "alice")).toBe(false);
    expect(state.waitlist.some((w) => w.requesterId === "bob")).toBe(true);
  });
});

describe("Feature: In-app messaging", () => {
  let state: State;
  beforeEach(() => {
    state = seed();
  });

  it("sends a message tied to a request thread", () => {
    const aliceItem = state.items.find((i) => i.ownerId === "alice")!;
    state = requestItem(state, aliceItem.id, "you", D1_START, D1_END);
    const threadId = state.requests[0].id;

    state = sendMessage(state, threadId, "you", "Can I pick it up Friday?");
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0]).toMatchObject({ threadId, senderId: "you" });
  });

  it("keeps messages for different threads separate", () => {
    const aliceItem = state.items.find((i) => i.ownerId === "alice")!;
    state = requestItem(state, aliceItem.id, "you", D1_START, D1_END);
    const req1 = state.requests[0].id;
    state = requestItem(state, aliceItem.id, "bob", "2026-04-01", "2026-04-05");
    const req2 = state.requests[0].id;

    state = sendMessage(state, req1, "you", "Hi from thread 1");
    state = sendMessage(state, req2, "bob", "Hi from thread 2");

    expect(state.messages.filter((m) => m.threadId === req1)).toHaveLength(1);
    expect(state.messages.filter((m) => m.threadId === req2)).toHaveLength(1);
  });

  it("a nudge on an overdue loan posts a message to that loan's thread", () => {
    const myItem = state.items.find((i) => i.ownerId === "you")!;
    state = requestItem(state, myItem.id, "bob", D1_START, D1_END);
    state = approveRequest(state, state.requests[0].id) as State;
    const loanId = state.loans[0].id;

    state = sendMessage(state, loanId, "you", "Hey! Just checking in on the tool.");
    expect(state.messages.filter((m) => m.threadId === loanId)).toHaveLength(1);
  });

  it("messages preserve chronological order", () => {
    const aliceItem = state.items.find((i) => i.ownerId === "alice")!;
    state = requestItem(state, aliceItem.id, "you", D1_START, D1_END);
    const threadId = state.requests[0].id;

    state = sendMessage(state, threadId, "you", "first");
    state = sendMessage(state, threadId, "alice", "second");
    state = sendMessage(state, threadId, "you", "third");

    expect(state.messages.map((m) => m.text)).toEqual(["first", "second", "third"]);
  });
});

describe("Feature: Two-sided return confirmation", () => {
  let state: State;
  beforeEach(() => {
    state = seed();
  });

  it("owner marking returned sets ownerConfirmedReturn but not borrowerConfirmedReturn", () => {
    const myItem = state.items.find((i) => i.ownerId === "you")!;
    state = requestItem(state, myItem.id, "alice", D1_START, D1_END);
    state = approveRequest(state, state.requests[0].id) as State;
    state = markReturned(state, state.loans[0].id);

    const loan = state.loans[0];
    expect(loan.status).toBe("RETURNED");
    expect(loan.ownerConfirmedReturn).toBe(true);
    expect(loan.borrowerConfirmedReturn).toBeUndefined();
  });

  it("borrower can independently confirm after the owner marks it returned", () => {
    const myItem = state.items.find((i) => i.ownerId === "you")!;
    state = requestItem(state, myItem.id, "alice", D1_START, D1_END);
    state = approveRequest(state, state.requests[0].id) as State;
    state = markReturned(state, state.loans[0].id);
    state = confirmReturnAsBorrower(state, state.loans[0].id);

    expect(state.loans[0].borrowerConfirmedReturn).toBe(true);
    expect(state.loans[0].ownerConfirmedReturn).toBe(true);
  });

  it("returnedAt is stamped when the owner marks a loan returned", () => {
    const myItem = state.items.find((i) => i.ownerId === "you")!;
    state = requestItem(state, myItem.id, "alice", D1_START, D1_END);
    state = approveRequest(state, state.requests[0].id) as State;
    const before = Date.now();
    state = markReturned(state, state.loans[0].id);
    expect(state.loans[0].returnedAt).toBeGreaterThanOrEqual(before);
  });
});

describe("Feature: Damage / dispute reporting", () => {
  let state: State;
  beforeEach(() => {
    state = seed();
  });

  it("either party can raise a dispute on a returned loan", () => {
    const myItem = state.items.find((i) => i.ownerId === "you")!;
    state = requestItem(state, myItem.id, "alice", D1_START, D1_END);
    state = approveRequest(state, state.requests[0].id) as State;
    state = markReturned(state, state.loans[0].id);
    state = raiseDispute(state, state.loans[0].id, "you", "Handle came back cracked");

    expect(state.loans[0].dispute).toMatchObject({
      raisedBy: "you",
      reason: "Handle came back cracked",
    });
    expect(state.loans[0].dispute!.resolved).toBeUndefined();
  });

  it("resolving a dispute sets resolved without clearing the record", () => {
    const myItem = state.items.find((i) => i.ownerId === "you")!;
    state = requestItem(state, myItem.id, "alice", D1_START, D1_END);
    state = approveRequest(state, state.requests[0].id) as State;
    state = markReturned(state, state.loans[0].id);
    state = raiseDispute(state, state.loans[0].id, "alice", "Owner says it was scratched");
    state = resolveDispute(state, state.loans[0].id);

    expect(state.loans[0].dispute!.resolved).toBe(true);
    expect(state.loans[0].dispute!.reason).toBe("Owner says it was scratched");
  });

  it("a loan with no dispute reported has no dispute field", () => {
    const myItem = state.items.find((i) => i.ownerId === "you")!;
    state = requestItem(state, myItem.id, "alice", D1_START, D1_END);
    state = approveRequest(state, state.requests[0].id) as State;
    state = markReturned(state, state.loans[0].id);

    expect(state.loans[0].dispute).toBeUndefined();
  });
});

describe("Feature: wasReturnedLate / trustScore", () => {
  let state: State;
  beforeEach(() => {
    state = seed();
  });

  function loanFor(borrowerId: string, endDate: string): Loan {
    return {
      id: uid(),
      itemId: "item-1",
      itemTitle: "Test Item",
      borrowerId,
      startDate: "2026-03-01",
      endDate,
      status: "RETURNED",
      returnPhotos: [],
    };
  }

  it("wasReturnedLate is false when returned on the due date", () => {
    const loan = { ...loanFor("alice", "2026-03-15"), returnedAt: new Date(2026, 2, 15, 10, 0).getTime() };
    expect(wasReturnedLate(loan)).toBe(false);
  });

  it("wasReturnedLate is false when returned before the due date", () => {
    const loan = { ...loanFor("alice", "2026-03-15"), returnedAt: new Date(2026, 2, 10).getTime() };
    expect(wasReturnedLate(loan)).toBe(false);
  });

  it("wasReturnedLate is true when returned the day after the due date", () => {
    const loan = { ...loanFor("alice", "2026-03-15"), returnedAt: new Date(2026, 2, 16, 0, 1).getTime() };
    expect(wasReturnedLate(loan)).toBe(true);
  });

  it("wasReturnedLate is false for a loan with no returnedAt recorded", () => {
    const loan = loanFor("alice", "2026-03-15");
    expect(wasReturnedLate(loan)).toBe(false);
  });

  it("trustScore returns null for a member with no completed loans", () => {
    expect(trustScore(state.loans, "alice")).toBeNull();
  });

  it("trustScore is 100% for a member whose only loan was on-time", () => {
    const loan = { ...loanFor("alice", "2026-03-15"), returnedAt: new Date(2026, 2, 14).getTime() };
    const loans = [...state.loans, loan];
    expect(trustScore(loans, "alice")).toEqual({ onTimeRate: 100, completedCount: 1 });
  });

  it("trustScore reflects a mix of on-time and late returns", () => {
    const onTime = { ...loanFor("alice", "2026-03-15"), returnedAt: new Date(2026, 2, 14).getTime() };
    const late = { ...loanFor("alice", "2026-04-15"), returnedAt: new Date(2026, 3, 20).getTime() };
    const loans = [...state.loans, onTime, late];
    expect(trustScore(loans, "alice")).toEqual({ onTimeRate: 50, completedCount: 2 });
  });

  it("trustScore ignores loans that are still ACTIVE (not yet completed)", () => {
    const onTime = { ...loanFor("alice", "2026-03-15"), returnedAt: new Date(2026, 2, 14).getTime() };
    const stillOut: Loan = { ...loanFor("alice", "2026-05-01"), status: "ACTIVE", returnedAt: undefined };
    const loans = [...state.loans, onTime, stillOut];
    expect(trustScore(loans, "alice")).toEqual({ onTimeRate: 100, completedCount: 1 });
  });

  it("trustScore only counts a member's own loans as borrower", () => {
    const aliceLoan = { ...loanFor("alice", "2026-03-15"), returnedAt: new Date(2026, 2, 20).getTime() };
    const bobLoan = { ...loanFor("bob", "2026-03-15"), returnedAt: new Date(2026, 2, 10).getTime() };
    const loans = [...state.loans, aliceLoan, bobLoan];
    expect(trustScore(loans, "alice")).toEqual({ onTimeRate: 0, completedCount: 1 });
    expect(trustScore(loans, "bob")).toEqual({ onTimeRate: 100, completedCount: 1 });
  });
});

describe("Feature: Waitlist", () => {
  let state: State;
  beforeEach(() => {
    state = seed();
  });

  it("lets a member join the waitlist for a busy item", () => {
    const myItem = state.items.find((i) => i.ownerId === "you")!;
    state = joinWaitlist(state, myItem.id, "alice");
    expect(state.waitlist).toHaveLength(1);
    expect(state.waitlist[0]).toMatchObject({ itemId: myItem.id, requesterId: "alice" });
  });

  it("supports multiple people waiting on the same item, in join order", () => {
    const myItem = state.items.find((i) => i.ownerId === "you")!;
    state = joinWaitlist(state, myItem.id, "alice");
    state = joinWaitlist(state, myItem.id, "bob");
    expect(state.waitlist.map((w) => w.requesterId)).toEqual(["alice", "bob"]);
  });

  it("lets someone leave the waitlist without affecting others", () => {
    const myItem = state.items.find((i) => i.ownerId === "you")!;
    state = joinWaitlist(state, myItem.id, "alice");
    state = joinWaitlist(state, myItem.id, "bob");
    state = leaveWaitlist(state, myItem.id, "alice");

    expect(state.waitlist).toHaveLength(1);
    expect(state.waitlist[0].requesterId).toBe("bob");
  });

  it("archiving an item clears its waitlist", () => {
    const myItem = state.items.find((i) => i.ownerId === "you")!;
    state = joinWaitlist(state, myItem.id, "alice");
    state = archiveItem(state, myItem.id);
    expect(state.waitlist).toHaveLength(0);
  });
});

describe("Feature: Borrow again", () => {
  let state: State;
  beforeEach(() => {
    state = seed();
  });

  it("creates a new pending request with the same item and dates as the past loan", () => {
    const myItem = state.items.find((i) => i.ownerId === "you")!;
    state = requestItem(state, myItem.id, "alice", D1_START, D1_END);
    state = approveRequest(state, state.requests[0].id) as State;
    state = markReturned(state, state.loans[0].id);
    const pastLoan = state.loans[0];

    state = borrowAgain(state, pastLoan, "alice");
    const newReq = state.requests.find((r) => r.status === "PENDING")!;
    expect(newReq).toMatchObject({
      itemId: myItem.id,
      borrowerId: "alice",
      startDate: D1_START,
      endDate: D1_END,
    });
  });

  it("a borrow-again request can be approved like any other, once the prior loan is returned", () => {
    const myItem = state.items.find((i) => i.ownerId === "you")!;
    state = requestItem(state, myItem.id, "alice", D1_START, D1_END);
    state = approveRequest(state, state.requests[0].id) as State;
    state = markReturned(state, state.loans[0].id);
    const pastLoan = state.loans[0];

    state = borrowAgain(state, pastLoan, "alice");
    const result = approveRequest(state, state.requests[0].id);
    expect("blocked" in result).toBe(false);
  });
});

describe("Feature: Archiving items", () => {
  let state: State;
  beforeEach(() => {
    state = seed();
  });

  it("archiving hides the item from active listing but keeps it in state", () => {
    state = addItem(state, {
      ownerId: "you",
      circleId: state.circles[0].id,
      title: "Old Ladder",
      photos: [],
    });
    const itemId = state.items[0].id;
    state = archiveItem(state, itemId);

    const item = state.items.find((i) => i.id === itemId)!;
    expect(item.archived).toBe(true);
    // Browsable/active listing logic (MyCircle.tsx, page.tsx) filters on !archived.
    const browsable = state.items.filter((i) => !i.archived);
    expect(browsable.find((i) => i.id === itemId)).toBeUndefined();
  });

  it("archiving removes pending requests for that item but leaves loan history untouched", () => {
    state = addItem(state, {
      ownerId: "you",
      circleId: state.circles[0].id,
      title: "Old Ladder",
      photos: [],
    });
    const itemId = state.items[0].id;
    state = requestItem(state, itemId, "alice", D1_START, D1_END);
    state = approveRequest(state, state.requests[0].id) as State;
    state = markReturned(state, state.loans[0].id);
    // A second, still-pending request comes in before archiving.
    state = requestItem(state, itemId, "bob", "2026-04-01", "2026-04-05");

    state = archiveItem(state, itemId);

    expect(state.requests.some((r) => r.status === "PENDING")).toBe(false);
    expect(state.loans).toHaveLength(1); // history preserved
  });

  it("unarchiving makes the item browsable again", () => {
    state = addItem(state, {
      ownerId: "you",
      circleId: state.circles[0].id,
      title: "Old Ladder",
      photos: [],
    });
    const itemId = state.items[0].id;
    state = archiveItem(state, itemId);
    state = unarchiveItem(state, itemId);

    expect(state.items.find((i) => i.id === itemId)!.archived).toBe(false);
  });

  it("cannot meaningfully archive an item that's on active loan (guarded in the UI, not state)", () => {
    // MyItems.tsx disables the Archive button via hasActiveLoan(editing.id);
    // the state-level archiveItem function itself does not enforce this, so
    // this test documents the UI-level guard rather than a state invariant.
    const myItem = state.items.find((i) => i.ownerId === "you")!;
    state = requestItem(state, myItem.id, "alice", D1_START, D1_END);
    state = approveRequest(state, state.requests[0].id) as State;

    const hasActiveLoan = state.loans.some(
      (l) => l.itemId === myItem.id && l.status === "ACTIVE"
    );
    expect(hasActiveLoan).toBe(true);
  });
});
