import { describe, it, expect } from "vitest";
import {
  assembleState,
  splitState,
  makeInviteCode,
  normalizeInviteCode,
  type CircleDoc,
} from "@/lib/store";
import type { State, Item, Request, Loan } from "@/lib/types";

const ME = "uid-me";
const FRIEND = "uid-friend";

function circleDoc(overrides: Partial<CircleDoc> = {}): CircleDoc {
  return {
    name: "Family",
    inviteCode: "ABC234",
    memberIds: [ME, FRIEND],
    memberProfiles: { [ME]: { name: "Me" }, [FRIEND]: { name: "Friend" } },
    items: [],
    requests: [],
    loans: [],
    updatedAt: 1,
    ...overrides,
  };
}

function item(id: string, circleId: string, ownerId: string): Item {
  return { id, circleId, ownerId, title: `Item ${id}`, photos: [], createdAt: 1 };
}

describe("invite codes", () => {
  it("generates 6-character codes from the safe alphabet", () => {
    for (let i = 0; i < 50; i++) {
      expect(makeInviteCode()).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
    }
  });

  it("normalizes user input", () => {
    expect(normalizeInviteCode("  abc234 ")).toBe("ABC234");
    expect(normalizeInviteCode("fam-x2k9p")).toBe("FAM-X2K9P");
    expect(normalizeInviteCode("a b!c")).toBe("ABC");
  });
});

describe("assembleState", () => {
  it("builds user, friends, and circles from docs", () => {
    const docs = { c1: circleDoc() };
    const state = assembleState(ME, "Me", docs);
    expect(state.user).toEqual({ id: ME, name: "Me", circles: ["c1"] });
    expect(state.friends).toEqual([{ id: FRIEND, name: "Friend" }]);
    expect(state.circles).toEqual([
      { id: "c1", name: "Family", inviteCode: "ABC234", members: [ME, FRIEND] },
    ]);
  });

  it("merges items, requests, and loans across circles", () => {
    const docs = {
      c1: circleDoc({ items: [item("i1", "c1", ME)] }),
      c2: circleDoc({ name: "Neighbors", inviteCode: "XYZ789", items: [item("i2", "c2", FRIEND)] }),
    };
    const state = assembleState(ME, "Me", docs);
    expect(state.items.map((i) => i.id).sort()).toEqual(["i1", "i2"]);
  });

  it("deduplicates friends shared across circles", () => {
    const docs = { c1: circleDoc(), c2: circleDoc({ name: "Other", inviteCode: "QQQ222" }) };
    const state = assembleState(ME, "Me", docs);
    expect(state.friends.length).toBe(1);
  });

  it("returns an empty state when the user has no circles", () => {
    const state = assembleState(ME, "Me", {});
    expect(state.circles).toEqual([]);
    expect(state.items).toEqual([]);
    expect(state.friends).toEqual([]);
  });
});

describe("splitState", () => {
  it("routes items, requests, and loans to their circle's doc", () => {
    const prevDocs = { c1: circleDoc(), c2: circleDoc({ name: "N", inviteCode: "ZZZ999" }) };
    const i1 = item("i1", "c1", ME);
    const i2 = item("i2", "c2", FRIEND);
    const req: Request = {
      id: "r1",
      itemId: "i2",
      borrowerId: ME,
      startDate: "2026-06-15",
      endDate: "2026-06-20",
      status: "PENDING",
      createdAt: 2,
    };
    const loan: Loan = {
      id: "l1",
      itemId: "i1",
      borrowerId: FRIEND,
      startDate: "2026-06-01",
      endDate: "2026-06-05",
      status: "ACTIVE",
      returnPhotos: [],
    };
    const state: State = {
      user: { id: ME, name: "Me", circles: ["c1", "c2"] },
      friends: [{ id: FRIEND, name: "Friend" }],
      circles: [
        { id: "c1", name: "Family", inviteCode: "ABC234", members: [ME, FRIEND] },
        { id: "c2", name: "N", inviteCode: "ZZZ999", members: [ME, FRIEND] },
      ],
      items: [i1, i2],
      requests: [req],
      loans: [loan],
    };
    const docs = splitState(state, prevDocs);
    expect(docs.c1.items.map((i) => i.id)).toEqual(["i1"]);
    expect(docs.c2.items.map((i) => i.id)).toEqual(["i2"]);
    expect(docs.c2.requests.map((r) => r.id)).toEqual(["r1"]);
    expect(docs.c1.loans.map((l) => l.id)).toEqual(["l1"]);
  });

  it("keeps loans in their previous circle if the item was deleted", () => {
    const oldLoan: Loan = {
      id: "l1",
      itemId: "gone",
      borrowerId: FRIEND,
      startDate: "2026-05-01",
      endDate: "2026-05-05",
      status: "RETURNED",
      returnPhotos: [],
    };
    const prevDocs = { c1: circleDoc({ loans: [oldLoan] }) };
    const state: State = {
      user: { id: ME, name: "Me", circles: ["c1"] },
      friends: [{ id: FRIEND, name: "Friend" }],
      circles: [{ id: "c1", name: "Family", inviteCode: "ABC234", members: [ME, FRIEND] }],
      items: [],
      requests: [],
      loans: [oldLoan],
    };
    const docs = splitState(state, prevDocs);
    expect(docs.c1.loans.map((l) => l.id)).toEqual(["l1"]);
  });

  it("preserves member profiles from previous docs", () => {
    const prevDocs = { c1: circleDoc() };
    const state = assembleState(ME, "Me", prevDocs);
    const docs = splitState(state, prevDocs);
    expect(docs.c1.memberProfiles[FRIEND]).toEqual({ name: "Friend" });
    expect(docs.c1.memberProfiles[ME]).toEqual({ name: "Me" });
  });

  it("roundtrips: assemble → split produces equivalent docs", () => {
    const prevDocs = {
      c1: circleDoc({
        items: [item("i1", "c1", ME), item("i2", "c1", FRIEND)],
      }),
    };
    const state = assembleState(ME, "Me", prevDocs);
    const docs = splitState(state, prevDocs);
    expect(docs.c1.items.map((i) => i.id).sort()).toEqual(["i1", "i2"]);
    expect(docs.c1.memberIds).toEqual(prevDocs.c1.memberIds);
    expect(docs.c1.inviteCode).toBe(prevDocs.c1.inviteCode);
  });
});
