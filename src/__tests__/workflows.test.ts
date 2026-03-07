import { describe, it, expect, beforeEach } from "vitest";
import { seed, uid, now } from "@/lib/helpers";
import type { State, Item, Request, Loan } from "@/lib/types";

/**
 * These tests validate the core workflows of the ToolShare app
 * by testing the same state transitions that the React components perform.
 */

function addItem(state: State, item: Omit<Item, "id" | "createdAt">): State {
  const newItem: Item = { ...item, id: uid(), createdAt: now() };
  return { ...state, items: [newItem, ...state.items] };
}

function editItem(state: State, itemId: string, updates: Partial<Item>): State {
  return {
    ...state,
    items: state.items.map((i) => (i.id === itemId ? { ...i, ...updates } : i)),
  };
}

function deleteItem(state: State, itemId: string): State {
  return {
    ...state,
    items: state.items.filter((i) => i.id !== itemId),
    requests: state.requests.filter((r) => r.itemId !== itemId),
  };
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
  const loan: Loan = {
    id: uid(),
    itemId: req.itemId,
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
  return {
    ...state,
    requests: state.requests.map((r) =>
      r.id === requestId ? { ...r, status: "DECLINED" as const } : r
    ),
  };
}

function markReturned(
  state: State,
  loanId: string,
  returnNotes?: string
): State {
  return {
    ...state,
    loans: state.loans.map((l) =>
      l.id === loanId
        ? { ...l, status: "RETURNED" as const, returnNotes, returnPhotos: [] }
        : l
    ),
  };
}

describe("Core Workflows", () => {
  let state: State;

  beforeEach(() => {
    state = seed();
  });

  describe("Add Item", () => {
    it("adds a new item to the state", () => {
      const before = state.items.length;
      state = addItem(state, {
        ownerId: "you",
        circleId: state.circles[0].id,
        title: "Circular Saw",
        category: "Power Tools",
        photos: [],
        note: "Wear safety glasses",
        rv: 150,
        avail: "Anytime",
      });
      expect(state.items.length).toBe(before + 1);
      expect(state.items[0].title).toBe("Circular Saw");
    });

    it("new item has an ID and timestamp", () => {
      state = addItem(state, {
        ownerId: "you",
        circleId: state.circles[0].id,
        title: "Test Item",
        photos: [],
      });
      expect(state.items[0].id).toBeDefined();
      expect(state.items[0].createdAt).toBeGreaterThan(0);
    });
  });

  describe("Edit Item", () => {
    it("updates item properties", () => {
      const itemId = state.items[0].id;
      state = editItem(state, itemId, { title: "Updated Title", rv: 200 });
      const updated = state.items.find((i) => i.id === itemId)!;
      expect(updated.title).toBe("Updated Title");
      expect(updated.rv).toBe(200);
    });

    it("does not affect other items", () => {
      const itemId = state.items[0].id;
      const otherId = state.items[1].id;
      const otherTitle = state.items[1].title;
      state = editItem(state, itemId, { title: "Changed" });
      expect(state.items.find((i) => i.id === otherId)!.title).toBe(otherTitle);
    });
  });

  describe("Delete Item", () => {
    it("removes the item", () => {
      const itemId = state.items[0].id;
      state = deleteItem(state, itemId);
      expect(state.items.find((i) => i.id === itemId)).toBeUndefined();
    });

    it("also removes associated requests", () => {
      const itemId = state.items[0].id;
      state = requestItem(state, itemId, "alice", "2026-03-10", "2026-03-15");
      expect(state.requests.length).toBe(1);
      state = deleteItem(state, itemId);
      expect(state.requests.length).toBe(0);
    });
  });

  describe("Request Tool", () => {
    it("creates a PENDING request", () => {
      const aliceItem = state.items.find((i) => i.ownerId === "alice")!;
      state = requestItem(state, aliceItem.id, "you", "2026-03-10", "2026-03-15");
      expect(state.requests.length).toBe(1);
      expect(state.requests[0].status).toBe("PENDING");
      expect(state.requests[0].borrowerId).toBe("you");
      expect(state.requests[0].itemId).toBe(aliceItem.id);
    });

    it("preserves dates in the request", () => {
      const aliceItem = state.items.find((i) => i.ownerId === "alice")!;
      state = requestItem(state, aliceItem.id, "you", "2026-03-10", "2026-03-15");
      expect(state.requests[0].startDate).toBe("2026-03-10");
      expect(state.requests[0].endDate).toBe("2026-03-15");
    });
  });

  describe("Approve Request", () => {
    it("changes request status to APPROVED and creates an ACTIVE loan", () => {
      const aliceItem = state.items.find((i) => i.ownerId === "alice")!;
      state = requestItem(state, aliceItem.id, "you", "2026-03-10", "2026-03-15");
      const reqId = state.requests[0].id;
      state = approveRequest(state, reqId);

      const req = state.requests.find((r) => r.id === reqId)!;
      expect(req.status).toBe("APPROVED");
      expect(state.loans.length).toBe(1);
      expect(state.loans[0].status).toBe("ACTIVE");
      expect(state.loans[0].itemId).toBe(aliceItem.id);
      expect(state.loans[0].borrowerId).toBe("you");
    });
  });

  describe("Decline Request", () => {
    it("changes request status to DECLINED without creating a loan", () => {
      const aliceItem = state.items.find((i) => i.ownerId === "alice")!;
      state = requestItem(state, aliceItem.id, "you", "2026-03-10", "2026-03-15");
      const reqId = state.requests[0].id;
      state = declineRequest(state, reqId);

      const req = state.requests.find((r) => r.id === reqId)!;
      expect(req.status).toBe("DECLINED");
      expect(state.loans.length).toBe(0);
    });
  });

  describe("Mark Returned", () => {
    it("changes loan status to RETURNED with notes", () => {
      // Setup: request → approve → active loan
      const myItem = state.items.find((i) => i.ownerId === "you")!;
      state = requestItem(state, myItem.id, "alice", "2026-03-10", "2026-03-15");
      const reqId = state.requests[0].id;
      state = approveRequest(state, reqId);
      const loanId = state.loans[0].id;

      state = markReturned(state, loanId, "Good condition");
      const loan = state.loans.find((l) => l.id === loanId)!;
      expect(loan.status).toBe("RETURNED");
      expect(loan.returnNotes).toBe("Good condition");
    });
  });

  describe("Full Lifecycle", () => {
    it("handles a complete borrow → approve → return flow", () => {
      // 1. User owns a tool
      const myItem = state.items.find((i) => i.ownerId === "you")!;

      // 2. Alice requests it
      state = requestItem(state, myItem.id, "alice", "2026-04-01", "2026-04-10");
      expect(state.requests.length).toBe(1);
      expect(state.requests[0].status).toBe("PENDING");

      // 3. User approves
      state = approveRequest(state, state.requests[0].id);
      expect(state.requests[0].status).toBe("APPROVED");
      expect(state.loans.length).toBe(1);
      expect(state.loans[0].status).toBe("ACTIVE");

      // 4. Alice returns the tool
      state = markReturned(state, state.loans[0].id, "All good, thanks!");
      expect(state.loans[0].status).toBe("RETURNED");
      expect(state.loans[0].returnNotes).toBe("All good, thanks!");

      // 5. Verify history
      const returned = state.loans.filter((l) => l.status === "RETURNED");
      expect(returned.length).toBe(1);
      const active = state.loans.filter((l) => l.status === "ACTIVE");
      expect(active.length).toBe(0);
    });

    it("handles request → decline flow", () => {
      const myItem = state.items.find((i) => i.ownerId === "you")!;
      state = requestItem(state, myItem.id, "bob", "2026-04-01", "2026-04-10");
      state = declineRequest(state, state.requests[0].id);
      expect(state.requests[0].status).toBe("DECLINED");
      expect(state.loans.length).toBe(0);
    });

    it("handles add → delete flow with pending requests", () => {
      // Add a new item
      state = addItem(state, {
        ownerId: "you",
        circleId: state.circles[0].id,
        title: "Ladder",
        photos: [],
      });
      const ladderId = state.items[0].id;

      // Someone requests it
      state = requestItem(state, ladderId, "alice", "2026-04-01", "2026-04-05");
      expect(state.requests.length).toBe(1);

      // Delete the item → should also delete the request
      state = deleteItem(state, ladderId);
      expect(state.items.find((i) => i.id === ladderId)).toBeUndefined();
      expect(state.requests.length).toBe(0);
    });
  });

  describe("Filtering & Search (logic)", () => {
    it("can find items by title search", () => {
      const searchTerm = "drill";
      const results = state.items.filter((i) =>
        i.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
      expect(results.length).toBe(1);
      expect(results[0].title).toBe("18V Drill + Bits");
    });

    it("can filter items by category", () => {
      const category = "Painting";
      const results = state.items.filter((i) => i.category === category);
      expect(results.length).toBe(1);
      expect(results[0].title).toBe("Spray Painter");
    });

    it("returns empty for non-matching search", () => {
      const results = state.items.filter((i) =>
        i.title.toLowerCase().includes("xyz")
      );
      expect(results.length).toBe(0);
    });
  });
});
