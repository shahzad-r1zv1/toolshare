import { describe, it, expect, beforeEach } from "vitest";
import { seed, uid, now, findOverlappingLoan, findOutstandingLoan, dueStatus } from "@/lib/helpers";
import type { State, Item, Request, Loan, WishlistEntry } from "@/lib/types";

/**
 * End-to-end scenario tests for the borrowing lifecycle: request, approve,
 * decline, renew, return, and the not-returned/overdue path. Complements
 * workflows.test.ts (which covers narrower unit-style transitions) with
 * fuller user-journey scenarios and edge cases.
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

function approveRequest(state: State, requestId: string): State {
  const req = state.requests.find((r) => r.id === requestId);
  if (!req) return state;

  // Renewal approval: extend the existing loan instead of creating a new one.
  if (req.renewLoanId) {
    return {
      ...state,
      requests: state.requests.map((r) =>
        r.id === requestId ? { ...r, status: "APPROVED" as const } : r
      ),
      loans: state.loans.map((l) =>
        l.id === req.renewLoanId
          ? { ...l, endDate: req.endDate, renewalRequestId: undefined }
          : l
      ),
    };
  }

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
  };
}

function declineRequest(state: State, requestId: string): State {
  const req = state.requests.find((r) => r.id === requestId);
  return {
    ...state,
    requests: state.requests.map((r) =>
      r.id === requestId ? { ...r, status: "DECLINED" as const } : r
    ),
    loans: req?.renewLoanId
      ? state.loans.map((l) =>
          l.id === req.renewLoanId ? { ...l, renewalRequestId: undefined } : l
        )
      : state.loans,
  };
}

function requestRenewal(state: State, loan: Loan, newEndDate: string): State {
  const req: Request = {
    id: uid(),
    itemId: loan.itemId,
    borrowerId: loan.borrowerId,
    startDate: loan.startDate,
    endDate: newEndDate,
    status: "PENDING",
    createdAt: now(),
    renewLoanId: loan.id,
  };
  return {
    ...state,
    requests: [req, ...state.requests],
    loans: state.loans.map((l) =>
      l.id === loan.id ? { ...l, renewalRequestId: req.id } : l
    ),
  };
}

function markReturned(state: State, loanId: string, returnNotes?: string): State {
  return {
    ...state,
    loans: state.loans.map((l) =>
      l.id === loanId
        ? { ...l, status: "RETURNED" as const, returnNotes, returnPhotos: [] }
        : l
    ),
  };
}

function addWishlistEntry(
  state: State,
  circleId: string,
  requesterId: string,
  title: string,
  note?: string
): State {
  const entry: WishlistEntry = {
    id: uid(),
    circleId,
    requesterId,
    title,
    note,
    createdAt: now(),
  };
  return { ...state, wishlist: [entry, ...state.wishlist] };
}

describe("Scenario: Requesting a tool", () => {
  let state: State;
  beforeEach(() => {
    state = seed();
  });

  it("lets a member request a tool owned by someone else in the circle", () => {
    const aliceItem = state.items.find((i) => i.ownerId === "alice")!;
    state = requestItem(state, aliceItem.id, "you", D1_START, D1_END);
    expect(state.requests).toHaveLength(1);
    expect(state.requests[0]).toMatchObject({
      itemId: aliceItem.id,
      borrowerId: "you",
      status: "PENDING",
    });
  });

  it("allows multiple pending requests for the same item from different people", () => {
    const aliceItem = state.items.find((i) => i.ownerId === "alice")!;
    state = requestItem(state, aliceItem.id, "you", D1_START, D1_END);
    state = requestItem(state, aliceItem.id, "bob", "2026-04-01", "2026-04-05");
    expect(state.requests).toHaveLength(2);
    expect(state.requests.every((r) => r.status === "PENDING")).toBe(true);
  });

  it("does not block a request purely for wanting your own item (UI-level check, not state)", () => {
    // The state layer itself does not forbid this; DetailsModal.tsx blocks it
    // at the UI level via isOwnItem. This test documents that the guard is
    // NOT enforced by the underlying request() transition.
    const myItem = state.items.find((i) => i.ownerId === "you")!;
    state = requestItem(state, myItem.id, "you", D1_START, D1_END);
    expect(state.requests).toHaveLength(1);
  });
});

describe("Scenario: Adding a tool", () => {
  let state: State;
  beforeEach(() => {
    state = seed();
  });

  it("adds a tool with full details", () => {
    const before = state.items.length;
    state = addItem(state, {
      ownerId: "you",
      circleId: state.circles[0].id,
      title: "Pressure Washer",
      category: "Cleaning",
      photos: [],
      note: "Needs a garden hose hookup",
      rv: 220,
      avail: "Weekends",
    });
    expect(state.items).toHaveLength(before + 1);
    const added = state.items[0];
    expect(added).toMatchObject({
      title: "Pressure Washer",
      category: "Cleaning",
      rv: 220,
    });
  });

  it("adds a tool with only the required title (all else optional)", () => {
    state = addItem(state, {
      ownerId: "you",
      circleId: state.circles[0].id,
      title: "Wheelbarrow",
      photos: [],
    });
    const added = state.items[0];
    expect(added.title).toBe("Wheelbarrow");
    expect(added.category).toBeUndefined();
    expect(added.rv).toBeUndefined();
  });

  it("a newly added tool is immediately requestable by another member", () => {
    state = addItem(state, {
      ownerId: "you",
      circleId: state.circles[0].id,
      title: "Ladder",
      photos: [],
    });
    const ladderId = state.items[0].id;
    state = requestItem(state, ladderId, "alice", D1_START, D1_END);
    expect(state.requests[0].itemId).toBe(ladderId);
  });
});

describe("Scenario: Borrowing a tool (request → approve → active loan)", () => {
  let state: State;
  beforeEach(() => {
    state = seed();
  });

  it("approving a request creates exactly one active loan with matching dates", () => {
    const myItem = state.items.find((i) => i.ownerId === "you")!;
    state = requestItem(state, myItem.id, "alice", D1_START, D1_END);
    state = approveRequest(state, state.requests[0].id);

    expect(state.loans).toHaveLength(1);
    const loan = state.loans[0];
    expect(loan.status).toBe("ACTIVE");
    expect(loan.startDate).toBe(D1_START);
    expect(loan.endDate).toBe(D1_END);
    expect(loan.borrowerId).toBe("alice");
  });

  it("rejects (flags) a second borrow request that overlaps an active loan on the same item", () => {
    const myItem = state.items.find((i) => i.ownerId === "you")!;
    state = requestItem(state, myItem.id, "alice", D1_START, D1_END);
    state = approveRequest(state, state.requests[0].id);

    // Bob tries to borrow the same item during an overlapping window.
    const conflict = findOverlappingLoan(state.loans, myItem.id, "2026-03-12", "2026-03-20");
    expect(conflict).toBeDefined();
    expect(conflict!.id).toBe(state.loans[0].id);
  });

  it("allows a back-to-back borrow once the first loan's window has passed", () => {
    const myItem = state.items.find((i) => i.ownerId === "you")!;
    state = requestItem(state, myItem.id, "alice", D1_START, D1_END);
    state = approveRequest(state, state.requests[0].id);

    const conflict = findOverlappingLoan(state.loans, myItem.id, "2026-03-16", "2026-03-20");
    expect(conflict).toBeUndefined();
  });

  it("loan retains a snapshot of the item's title/category even if the item is later deleted", () => {
    const myItem = state.items.find((i) => i.ownerId === "you")!;
    state = requestItem(state, myItem.id, "alice", D1_START, D1_END);
    state = approveRequest(state, state.requests[0].id);
    const loanId = state.loans[0].id;

    // Delete the underlying item.
    state = {
      ...state,
      items: state.items.filter((i) => i.id !== myItem.id),
    };

    const loan = state.loans.find((l) => l.id === loanId)!;
    expect(loan.itemTitle).toBe(myItem.title);
    expect(loan.itemCategory).toBe(myItem.category);
  });
});

describe("Scenario: Declining a request", () => {
  let state: State;
  beforeEach(() => {
    state = seed();
  });

  it("leaves no loan behind when declined", () => {
    const myItem = state.items.find((i) => i.ownerId === "you")!;
    state = requestItem(state, myItem.id, "bob", D1_START, D1_END);
    state = declineRequest(state, state.requests[0].id);

    expect(state.requests[0].status).toBe("DECLINED");
    expect(state.loans).toHaveLength(0);
  });

  it("the same item can be re-requested and approved after an earlier decline", () => {
    const myItem = state.items.find((i) => i.ownerId === "you")!;
    state = requestItem(state, myItem.id, "bob", D1_START, D1_END);
    state = declineRequest(state, state.requests[0].id);

    state = requestItem(state, myItem.id, "bob", D1_START, D1_END);
    state = approveRequest(state, state.requests[0].id);
    expect(state.loans).toHaveLength(1);
    expect(state.loans[0].status).toBe("ACTIVE");
  });
});

describe("Scenario: Not returning a tool (overdue tracking)", () => {
  let state: State;
  beforeEach(() => {
    state = seed();
  });

  it("dueStatus reports 'ok' well before the due date", () => {
    const today = new Date("2026-03-01T00:00:00");
    expect(dueStatus("2026-03-15", today)).toBe("ok");
  });

  it("dueStatus reports 'due-soon' exactly one day before the due date", () => {
    const today = new Date("2026-03-14T00:00:00");
    expect(dueStatus("2026-03-15", today)).toBe("due-soon");
  });

  it("dueStatus reports 'due-today' on the due date itself", () => {
    const today = new Date("2026-03-15T00:00:00");
    expect(dueStatus("2026-03-15", today)).toBe("due-today");
  });

  it("dueStatus reports 'overdue' the day after the due date", () => {
    const today = new Date("2026-03-16T00:00:00");
    expect(dueStatus("2026-03-15", today)).toBe("overdue");
  });

  it("dueStatus stays 'overdue' many days past the due date (does not reset)", () => {
    const today = new Date("2026-04-01T00:00:00");
    expect(dueStatus("2026-03-15", today)).toBe("overdue");
  });

  it("an overdue loan remains ACTIVE (not auto-returned) until explicitly marked returned", () => {
    const myItem = state.items.find((i) => i.ownerId === "you")!;
    state = requestItem(state, myItem.id, "alice", D1_START, D1_END);
    state = approveRequest(state, state.requests[0].id);

    const status = dueStatus(state.loans[0].endDate, new Date("2026-04-01T00:00:00"));
    expect(status).toBe("overdue");
    expect(state.loans[0].status).toBe("ACTIVE");
  });

  it("an overdue loan blocks a new request whose dates still overlap its stated window", () => {
    const myItem = state.items.find((i) => i.ownerId === "you")!;
    state = requestItem(state, myItem.id, "alice", D1_START, D1_END);
    state = approveRequest(state, state.requests[0].id);
    // Loan is now overdue (never returned) but still ACTIVE.

    const conflict = findOverlappingLoan(state.loans, myItem.id, "2026-03-12", "2026-03-20");
    expect(conflict).toBeDefined();
  });

  it("findOverlappingLoan alone (pure date-range check) misses a never-returned loan for future dates", () => {
    // findOverlappingLoan only compares stated startDate/endDate ranges, with
    // no concept of "physically still in someone's possession" — so on its
    // own it would miss an item that's overdue and never returned when a new
    // request's dates fall entirely after the original due date. This is why
    // Requests.tsx now also checks findOutstandingLoan before approving (see
    // the next test) rather than relying on findOverlappingLoan alone.
    const myItem = state.items.find((i) => i.ownerId === "you")!;
    state = requestItem(state, myItem.id, "alice", D1_START, D1_END);
    state = approveRequest(state, state.requests[0].id);

    const conflict = findOverlappingLoan(state.loans, myItem.id, "2026-03-16", "2026-03-20");
    expect(conflict).toBeUndefined();
  });

  it("findOutstandingLoan blocks a never-returned item regardless of the new request's dates", () => {
    const myItem = state.items.find((i) => i.ownerId === "you")!;
    state = requestItem(state, myItem.id, "alice", D1_START, D1_END);
    state = approveRequest(state, state.requests[0].id);

    // Even far-future dates are blocked while the loan is outstanding —
    // this is the check Requests.tsx.approve performs (see helpers.ts).
    const outstanding = findOutstandingLoan(state.loans, myItem.id);
    expect(outstanding?.id).toBe(state.loans[0].id);
  });

  it("findOutstandingLoan returns undefined once the loan is returned", () => {
    const myItem = state.items.find((i) => i.ownerId === "you")!;
    state = requestItem(state, myItem.id, "alice", D1_START, D1_END);
    state = approveRequest(state, state.requests[0].id);
    state = markReturned(state, state.loans[0].id);

    expect(findOutstandingLoan(state.loans, myItem.id)).toBeUndefined();
  });

  it("marking an overdue loan returned clears it from the overlap check going forward", () => {
    const myItem = state.items.find((i) => i.ownerId === "you")!;
    state = requestItem(state, myItem.id, "alice", D1_START, D1_END);
    state = approveRequest(state, state.requests[0].id);
    state = markReturned(state, state.loans[0].id, "Returned late, sorry!");

    expect(state.loans[0].status).toBe("RETURNED");
    const conflict = findOverlappingLoan(state.loans, myItem.id, D1_START, D1_END);
    expect(conflict).toBeUndefined();
  });
});

describe("Scenario: Requesting a renewal/extension", () => {
  let state: State;
  beforeEach(() => {
    state = seed();
  });

  function activeLoan(borrowerId: string, ownerId: "you" | "alice" = "you") {
    const item = state.items.find((i) => i.ownerId === ownerId)!;
    state = requestItem(state, item.id, borrowerId, D1_START, D1_END);
    state = approveRequest(state, state.requests[0].id);
    return state.loans[0];
  }

  it("creates a renewal request linked to the original loan via renewLoanId", () => {
    const loan = activeLoan("alice");
    state = requestRenewal(state, loan, "2026-03-20");

    const renewalReq = state.requests.find((r) => r.renewLoanId === loan.id)!;
    expect(renewalReq).toBeDefined();
    expect(renewalReq.status).toBe("PENDING");
    expect(renewalReq.endDate).toBe("2026-03-20");
  });

  it("marks the loan as having a pending renewal", () => {
    const loan = activeLoan("alice");
    state = requestRenewal(state, loan, "2026-03-20");

    const updatedLoan = state.loans.find((l) => l.id === loan.id)!;
    expect(updatedLoan.renewalRequestId).toBeDefined();
  });

  it("approving a renewal extends the loan's end date instead of creating a second loan", () => {
    const loan = activeLoan("alice");
    state = requestRenewal(state, loan, "2026-03-20");
    const renewalReqId = state.requests.find((r) => r.renewLoanId === loan.id)!.id;

    state = approveRequest(state, renewalReqId);

    expect(state.loans).toHaveLength(1);
    const updatedLoan = state.loans.find((l) => l.id === loan.id)!;
    expect(updatedLoan.endDate).toBe("2026-03-20");
    expect(updatedLoan.status).toBe("ACTIVE");
    expect(updatedLoan.renewalRequestId).toBeUndefined();
  });

  it("declining a renewal keeps the original due date and clears the pending flag", () => {
    const loan = activeLoan("alice");
    state = requestRenewal(state, loan, "2026-03-20");
    const renewalReqId = state.requests.find((r) => r.renewLoanId === loan.id)!.id;

    state = declineRequest(state, renewalReqId);

    const updatedLoan = state.loans.find((l) => l.id === loan.id)!;
    expect(updatedLoan.endDate).toBe(D1_END); // unchanged
    expect(updatedLoan.renewalRequestId).toBeUndefined();
    expect(state.requests.find((r) => r.id === renewalReqId)!.status).toBe("DECLINED");
  });

  it("a requested extension that would collide with someone else's separate loan should be flagged by the caller", () => {
    // Alice has the item March 10-15 (still active/outstanding — never returned).
    const loan = activeLoan("alice");
    const item = state.items.find((i) => i.id === loan.itemId)!;
    // Meanwhile Bob is separately approved for March 20-25 on the same item
    // (e.g. the owner double-booked, or approved Bob's request before
    // noticing Alice's loan was still open).
    state = requestItem(state, item.id, "bob", "2026-03-20", "2026-03-25");
    state = approveRequest(state, state.requests[0].id);
    const bobLoan = state.loans.find((l) => l.borrowerId === "bob")!;

    // Alice now asks to extend her loan out to March 22, which would overlap
    // Bob's window. Replicates the exact conflict check Requests.tsx.approve
    // runs before approving a renewal (see the `if (r.renewLoanId)` branch).
    const requestedNewEnd = "2026-03-22";
    const conflict = state.loans.find(
      (l) =>
        l.id !== loan.id &&
        l.itemId === item.id &&
        l.status === "ACTIVE" &&
        l.startDate <= requestedNewEnd &&
        loan.startDate <= l.endDate
    );
    expect(conflict?.id).toBe(bobLoan.id);
  });
});

describe("Scenario: Wishlist", () => {
  let state: State;
  beforeEach(() => {
    state = seed();
  });

  it("posts a new wishlist entry for the active circle", () => {
    const circleId = state.circles[0].id;
    state = addWishlistEntry(state, circleId, "you", "Pressure washer", "Need it this weekend");
    expect(state.wishlist).toHaveLength(1);
    expect(state.wishlist[0]).toMatchObject({
      circleId,
      requesterId: "you",
      title: "Pressure washer",
    });
  });

  it("removing a wishlist entry only affects that entry", () => {
    const circleId = state.circles[0].id;
    state = addWishlistEntry(state, circleId, "you", "Pressure washer");
    state = addWishlistEntry(state, circleId, "bob", "Chainsaw");
    const keepId = state.wishlist.find((w) => w.title === "Chainsaw")!.id;
    const removeId = state.wishlist.find((w) => w.title === "Pressure washer")!.id;

    state = { ...state, wishlist: state.wishlist.filter((w) => w.id !== removeId) };
    expect(state.wishlist).toHaveLength(1);
    expect(state.wishlist[0].id).toBe(keepId);
  });
});

describe("Scenario: Full end-to-end journeys", () => {
  let state: State;
  beforeEach(() => {
    state = seed();
  });

  it("happy path: add → request → approve → renew → approve renewal → return", () => {
    state = addItem(state, {
      ownerId: "you",
      circleId: state.circles[0].id,
      title: "Chainsaw",
      category: "Yard & Garden",
      photos: [],
    });
    const chainsawId = state.items[0].id;

    state = requestItem(state, chainsawId, "alice", D1_START, D1_END);
    expect(state.requests[0].status).toBe("PENDING");

    state = approveRequest(state, state.requests[0].id);
    expect(state.loans[0].status).toBe("ACTIVE");
    const loan = state.loans[0];

    state = requestRenewal(state, loan, "2026-03-22");
    const renewalReqId = state.requests.find((r) => r.renewLoanId === loan.id)!.id;
    state = approveRequest(state, renewalReqId);
    expect(state.loans[0].endDate).toBe("2026-03-22");

    state = markReturned(state, loan.id, "Thanks, worked great!");
    expect(state.loans[0].status).toBe("RETURNED");
    expect(state.loans.filter((l) => l.status === "ACTIVE")).toHaveLength(0);
  });

  it("unhappy path: request → approve → never returned → stays overdue indefinitely and still blocks all new requests", () => {
    const myItem = state.items.find((i) => i.ownerId === "you")!;
    state = requestItem(state, myItem.id, "bob", D1_START, D1_END);
    state = approveRequest(state, state.requests[0].id);

    const overdueCheck = dueStatus(state.loans[0].endDate, new Date("2026-05-01T00:00:00"));
    expect(overdueCheck).toBe("overdue");
    expect(state.loans[0].status).toBe("ACTIVE"); // never auto-resolves

    // Dates that still overlap the original (never-returned) window are blocked...
    const overlapping = findOverlappingLoan(state.loans, myItem.id, "2026-03-13", "2026-03-20");
    expect(overlapping).toBeDefined();

    // ...and thanks to findOutstandingLoan (used by Requests.tsx.approve),
    // a far-future request against the same never-returned item is ALSO
    // blocked, regardless of dates, until it's marked returned.
    expect(findOutstandingLoan(state.loans, myItem.id)).toBeDefined();
  });

  it("multi-borrower fairness: two people can't both hold overlapping loans on the same item", () => {
    const myItem = state.items.find((i) => i.ownerId === "you")!;
    state = requestItem(state, myItem.id, "alice", D1_START, D1_END);
    state = approveRequest(state, state.requests[0].id);

    // Bob's overlapping request should be flagged before approval in the UI;
    // simulate the guard here.
    const conflict = findOverlappingLoan(state.loans, myItem.id, "2026-03-12", "2026-03-18");
    expect(conflict).toBeDefined();

    // Bob requests non-overlapping dates instead — should succeed independently.
    state = requestItem(state, myItem.id, "bob", "2026-03-20", "2026-03-25");
    state = approveRequest(state, state.requests[0].id);
    const activeLoans = state.loans.filter((l) => l.status === "ACTIVE");
    expect(activeLoans).toHaveLength(2);
  });
});
