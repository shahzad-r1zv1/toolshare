import { describe, it, expect, beforeEach } from "vitest";
import {
  seed,
  uid,
  now,
  isMessageUnread,
  unreadMessageCount,
  totalUnreadMessages,
} from "@/lib/helpers";
import type { State, Message, Request, Loan } from "@/lib/types";

/**
 * Messages need to be visible as unread somewhere other than "you happened
 * to open that exact request/loan card" — these tests cover the read-state
 * tracking (isMessageUnread), the per-thread count shown on the Message
 * button, and the total-unread count surfaced as a tab badge.
 */

function message(overrides: Partial<Message> = {}): Message {
  return {
    id: uid(),
    threadId: "thread-1",
    senderId: "alice",
    text: "hello",
    createdAt: now(),
    ...overrides,
  };
}

describe("isMessageUnread", () => {
  it("is unread for a recipient who hasn't opened the thread", () => {
    const m = message({ senderId: "alice", readBy: ["alice"] });
    expect(isMessageUnread(m, "you")).toBe(true);
  });

  it("is read once the recipient's id is in readBy", () => {
    const m = message({ senderId: "alice", readBy: ["alice", "you"] });
    expect(isMessageUnread(m, "you")).toBe(false);
  });

  it("is never unread for the sender themselves", () => {
    const m = message({ senderId: "alice", readBy: ["alice"] });
    expect(isMessageUnread(m, "alice")).toBe(false);
  });

  it("treats a message with no readBy at all as unread for everyone but the sender", () => {
    const m = message({ senderId: "alice", readBy: undefined });
    expect(isMessageUnread(m, "you")).toBe(true);
    expect(isMessageUnread(m, "alice")).toBe(false);
  });
});

describe("unreadMessageCount", () => {
  it("counts only unread messages in the given thread for the given user", () => {
    const messages: Message[] = [
      message({ threadId: "t1", senderId: "alice", readBy: ["alice"] }),
      message({ threadId: "t1", senderId: "alice", readBy: ["alice", "you"] }),
      message({ threadId: "t1", senderId: "you", readBy: ["you"] }),
      message({ threadId: "t2", senderId: "alice", readBy: ["alice"] }),
    ];
    expect(unreadMessageCount(messages, "t1", "you")).toBe(1);
  });

  it("is 0 for a thread with no messages", () => {
    expect(unreadMessageCount([], "t1", "you")).toBe(0);
  });

  it("is 0 once every message in the thread has been read", () => {
    const messages: Message[] = [
      message({ threadId: "t1", senderId: "alice", readBy: ["alice", "you"] }),
      message({ threadId: "t1", senderId: "alice", readBy: ["alice", "you"] }),
    ];
    expect(unreadMessageCount(messages, "t1", "you")).toBe(0);
  });
});

describe("totalUnreadMessages", () => {
  let state: State;
  beforeEach(() => {
    state = seed();
  });

  it("is 0 when there are no messages", () => {
    expect(totalUnreadMessages(state, "you")).toBe(0);
  });

  it("counts unread messages on a request thread you sent (as borrower)", () => {
    const aliceItem = state.items.find((i) => i.ownerId === "alice")!;
    const req: Request = {
      id: uid(),
      itemId: aliceItem.id,
      borrowerId: "you",
      startDate: "2026-03-10",
      endDate: "2026-03-15",
      status: "PENDING",
      createdAt: now(),
    };
    state = {
      ...state,
      requests: [req],
      messages: [message({ threadId: req.id, senderId: "alice", readBy: ["alice"] })],
    };
    expect(totalUnreadMessages(state, "you")).toBe(1);
  });

  it("counts unread messages on a request thread for an item you own", () => {
    const myItem = state.items.find((i) => i.ownerId === "you")!;
    const req: Request = {
      id: uid(),
      itemId: myItem.id,
      borrowerId: "alice",
      startDate: "2026-03-10",
      endDate: "2026-03-15",
      status: "PENDING",
      createdAt: now(),
    };
    state = {
      ...state,
      requests: [req],
      messages: [message({ threadId: req.id, senderId: "alice", readBy: ["alice"] })],
    };
    expect(totalUnreadMessages(state, "you")).toBe(1);
  });

  it("counts unread messages on an active loan thread", () => {
    const myItem = state.items.find((i) => i.ownerId === "you")!;
    const loan: Loan = {
      id: uid(),
      itemId: myItem.id,
      itemTitle: myItem.title,
      borrowerId: "alice",
      startDate: "2026-03-10",
      endDate: "2026-03-15",
      status: "ACTIVE",
      returnPhotos: [],
    };
    state = {
      ...state,
      loans: [loan],
      messages: [message({ threadId: loan.id, senderId: "alice", readBy: ["alice"] })],
    };
    expect(totalUnreadMessages(state, "you")).toBe(1);
  });

  it("does not count messages you sent yourself", () => {
    const aliceItem = state.items.find((i) => i.ownerId === "alice")!;
    const req: Request = {
      id: uid(),
      itemId: aliceItem.id,
      borrowerId: "you",
      startDate: "2026-03-10",
      endDate: "2026-03-15",
      status: "PENDING",
      createdAt: now(),
    };
    state = {
      ...state,
      requests: [req],
      messages: [message({ threadId: req.id, senderId: "you", readBy: ["you"] })],
    };
    expect(totalUnreadMessages(state, "you")).toBe(0);
  });

  it("does not count messages on a thread you're not a party to", () => {
    // A thread between alice and bob on an item you don't own.
    const bobItem = { ...state.items[0], id: uid(), ownerId: "bob" };
    const req: Request = {
      id: uid(),
      itemId: bobItem.id,
      borrowerId: "alice",
      startDate: "2026-03-10",
      endDate: "2026-03-15",
      status: "PENDING",
      createdAt: now(),
    };
    state = {
      ...state,
      items: [...state.items, bobItem],
      requests: [req],
      messages: [message({ threadId: req.id, senderId: "alice", readBy: ["alice"] })],
    };
    expect(totalUnreadMessages(state, "you")).toBe(0);
  });

  it("drops to 0 once all unread messages are marked read (mirrors opening the thread)", () => {
    const aliceItem = state.items.find((i) => i.ownerId === "alice")!;
    const req: Request = {
      id: uid(),
      itemId: aliceItem.id,
      borrowerId: "you",
      startDate: "2026-03-10",
      endDate: "2026-03-15",
      status: "PENDING",
      createdAt: now(),
    };
    const msg = message({ threadId: req.id, senderId: "alice", readBy: ["alice"] });
    state = { ...state, requests: [req], messages: [msg] };
    expect(totalUnreadMessages(state, "you")).toBe(1);

    // Simulate MessageThreadModal's mark-as-read effect.
    state = {
      ...state,
      messages: state.messages.map((m) =>
        m.id === msg.id ? { ...m, readBy: [...(m.readBy || []), "you"] } : m
      ),
    };
    expect(totalUnreadMessages(state, "you")).toBe(0);
  });

  it("sums unread messages across multiple distinct threads", () => {
    const aliceItem = state.items.find((i) => i.ownerId === "alice")!;
    const req1: Request = {
      id: uid(),
      itemId: aliceItem.id,
      borrowerId: "you",
      startDate: "2026-03-10",
      endDate: "2026-03-15",
      status: "PENDING",
      createdAt: now(),
    };
    const req2: Request = {
      id: uid(),
      itemId: aliceItem.id,
      borrowerId: "you",
      startDate: "2026-04-01",
      endDate: "2026-04-05",
      status: "PENDING",
      createdAt: now(),
    };
    state = {
      ...state,
      requests: [req1, req2],
      messages: [
        message({ threadId: req1.id, senderId: "alice", readBy: ["alice"] }),
        message({ threadId: req1.id, senderId: "alice", readBy: ["alice"] }),
        message({ threadId: req2.id, senderId: "alice", readBy: ["alice"] }),
      ],
    };
    expect(totalUnreadMessages(state, "you")).toBe(3);
  });
});
