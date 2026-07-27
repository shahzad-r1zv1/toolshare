import { describe, it, expect, beforeEach } from "vitest";
import {
  seed,
  uid,
  now,
  distanceMiles,
  distanceLabel,
  coarsenLocation,
  rentalCost,
} from "@/lib/helpers";
import type {
  State,
  Consumable,
  ConsumableClaim,
  RoughLocation,
  Loan,
} from "@/lib/types";

/**
 * Tests for the 4 features layered on top of the network/marketplace side of
 * ToolShare: rough location + distance, cross-circle search, rental
 * rate/cost tracking, and consumables (leftover materials).
 */

describe("Feature: Rough location & distance", () => {
  // San Francisco and Oakland, roughly 8 miles apart across the bay.
  const SF: RoughLocation = { lat: 37.7749, lng: -122.4194 };
  const OAKLAND: RoughLocation = { lat: 37.8044, lng: -122.2712 };

  it("distanceMiles returns 0 for identical locations", () => {
    expect(distanceMiles(SF, SF)).toBeCloseTo(0, 5);
  });

  it("distanceMiles returns a plausible distance between two real cities", () => {
    const miles = distanceMiles(SF, OAKLAND);
    expect(miles).toBeGreaterThan(5);
    expect(miles).toBeLessThan(15);
  });

  it("distanceMiles is symmetric", () => {
    expect(distanceMiles(SF, OAKLAND)).toBeCloseTo(distanceMiles(OAKLAND, SF), 5);
  });

  it("distanceLabel returns undefined when either location is missing", () => {
    expect(distanceLabel(undefined, OAKLAND)).toBeUndefined();
    expect(distanceLabel(SF, undefined)).toBeUndefined();
    expect(distanceLabel(undefined, undefined)).toBeUndefined();
  });

  it("distanceLabel formats a normal distance with the mi suffix", () => {
    const label = distanceLabel(SF, OAKLAND);
    expect(label).toMatch(/mi away$/);
  });

  it("distanceLabel says 'nearby' for essentially the same spot", () => {
    const almostSF: RoughLocation = { lat: 37.7750, lng: -122.4195 };
    expect(distanceLabel(SF, almostSF)).toBe("nearby");
  });

  it("coarsenLocation rounds to reduce precision", () => {
    const precise: RoughLocation = { lat: 37.774912345, lng: -122.419412345 };
    const coarse = coarsenLocation(precise);
    expect(coarse.lat).toBe(37.77);
    expect(coarse.lng).toBe(-122.42);
  });

  it("a member with no location set produces no distance label", () => {
    const state = seed();
    expect(state.user.location).toBeUndefined();
    expect(distanceLabel(state.user.location, SF)).toBeUndefined();
  });
});

describe("Feature: Cross-circle network search", () => {
  let state: State;
  beforeEach(() => {
    state = seed();
  });

  function addSecondCircleWithItem() {
    const circle2 = {
      id: uid(),
      name: "Neighbors",
      inviteCode: "NBR-" + uid().slice(0, 5).toUpperCase(),
      members: [state.user.id, "carol"],
    };
    const item = {
      id: uid(),
      ownerId: "carol",
      circleId: circle2.id,
      title: "Pressure Washer",
      photos: [],
      createdAt: now(),
    };
    return {
      ...state,
      circles: [...state.circles, circle2],
      friends: [...state.friends, { id: "carol", name: "Carol" }],
      items: [...state.items, item],
      user: { ...state.user, circles: [...state.user.circles, circle2.id] },
    };
  }

  it("state.items already spans every circle the user belongs to (the data cross-circle search relies on)", () => {
    state = addSecondCircleWithItem();
    const activeCircleId = state.circles[0].id;

    // The active-circle-only view (what MyCircle.tsx shows) would miss it...
    const inActiveCircleOnly = state.items.filter((i) => i.circleId === activeCircleId);
    expect(inActiveCircleOnly.some((i) => i.title === "Pressure Washer")).toBe(false);

    // ...but the full state (what NetworkSearchResults.tsx searches) has it.
    expect(state.items.some((i) => i.title === "Pressure Washer")).toBe(true);
  });

  it("network search matches by title across all circles, case-insensitively", () => {
    state = addSecondCircleWithItem();
    const results = state.items
      .filter((i) => !i.archived)
      .filter((i) => i.title.toLowerCase().includes("pressure"));
    expect(results).toHaveLength(1);
    expect(results[0].circleId).not.toBe(state.circles[0].id);
  });

  it("network search excludes archived items", () => {
    state = addSecondCircleWithItem();
    const target = state.items.find((i) => i.title === "Pressure Washer")!;
    state = {
      ...state,
      items: state.items.map((i) => (i.id === target.id ? { ...i, archived: true } : i)),
    };
    const results = state.items
      .filter((i) => !i.archived)
      .filter((i) => i.title.toLowerCase().includes("pressure"));
    expect(results).toHaveLength(0);
  });

  it("network search finds nothing when no circle has a matching item", () => {
    state = addSecondCircleWithItem();
    const results = state.items.filter((i) =>
      i.title.toLowerCase().includes("nonexistent-tool-xyz")
    );
    expect(results).toHaveLength(0);
  });
});

describe("Feature: Rental rate & cost tracking", () => {
  it("rentalCost for a flat rate ignores the date range", () => {
    const cost = rentalCost({ amount: 25, unit: "flat" }, "2026-03-01", "2026-03-10");
    expect(cost).toBe(25);
  });

  it("rentalCost for a per-day rate multiplies by inclusive nights", () => {
    // March 1 through March 3 inclusive = 3 days.
    const cost = rentalCost({ amount: 10, unit: "day" }, "2026-03-01", "2026-03-03");
    expect(cost).toBe(30);
  });

  it("rentalCost for a single-day loan (same start/end) charges for 1 day minimum", () => {
    const cost = rentalCost({ amount: 15, unit: "day" }, "2026-03-01", "2026-03-01");
    expect(cost).toBe(15);
  });

  it("rentalCost handles a longer multi-week window", () => {
    // March 1 through March 14 inclusive = 14 days.
    const cost = rentalCost({ amount: 5, unit: "day" }, "2026-03-01", "2026-03-14");
    expect(cost).toBe(70);
  });

  it("an item with no rate produces no cost when a loan is created (mirrors Requests.tsx.approve)", () => {
    const state = seed();
    const item = state.items[0];
    expect(item.rate).toBeUndefined();
    const cost = item.rate ? rentalCost(item.rate, "2026-03-01", "2026-03-05") : undefined;
    expect(cost).toBeUndefined();
  });

  it("an item with a rate produces a stamped cost when a loan is created (mirrors Requests.tsx.approve)", () => {
    const state = seed();
    const item = { ...state.items[0], rate: { amount: 8, unit: "day" as const } };
    const cost = item.rate ? rentalCost(item.rate, "2026-03-01", "2026-03-05") : undefined;
    expect(cost).toBe(40); // 5 days * $8
  });

  it("renewing a loan recomputes cost for the new end date (mirrors Requests.tsx renewal branch)", () => {
    const rate = { amount: 10, unit: "day" as const };
    const originalCost = rentalCost(rate, "2026-03-01", "2026-03-03"); // 3 days = 30
    const extendedCost = rentalCost(rate, "2026-03-01", "2026-03-06"); // 6 days = 60
    expect(originalCost).toBe(30);
    expect(extendedCost).toBe(60);
  });

  it("a loan starts unpaid by default and can be marked paid", () => {
    const state = seed();
    const loan: Loan = {
      id: uid(),
      itemId: state.items[0].id,
      itemTitle: state.items[0].title,
      borrowerId: "alice",
      startDate: "2026-03-01",
      endDate: "2026-03-05",
      status: "ACTIVE",
      returnPhotos: [],
      rate: { amount: 8, unit: "day" },
      cost: 40,
    };
    expect(loan.paid).toBeUndefined();
    const paidLoan = { ...loan, paid: true };
    expect(paidLoan.paid).toBe(true);
  });
});

describe("Feature: Consumables", () => {
  let state: State;
  beforeEach(() => {
    state = seed();
  });

  function postConsumable(overrides: Partial<Consumable> = {}): State {
    const item: Consumable = {
      id: uid(),
      ownerId: "you",
      circleId: state.circles[0].id,
      title: "Leftover Deck Paint",
      quantity: "2 gallons",
      photos: [],
      createdAt: now(),
      ...overrides,
    };
    return { ...state, consumables: [item, ...state.consumables] };
  }

  function claim(consumableId: string, claimerId: string, amount: string): State {
    const c: ConsumableClaim = {
      id: uid(),
      consumableId,
      claimerId,
      amount,
      createdAt: now(),
    };
    return { ...state, consumableClaims: [...state.consumableClaims, c] };
  }

  it("posts a consumable with a free-text quantity", () => {
    state = postConsumable();
    expect(state.consumables).toHaveLength(1);
    expect(state.consumables[0]).toMatchObject({
      title: "Leftover Deck Paint",
      quantity: "2 gallons",
      ownerId: "you",
    });
  });

  it("lets another member claim some of it without changing the posted quantity", () => {
    state = postConsumable();
    const id = state.consumables[0].id;
    state = claim(id, "alice", "1 gallon");

    expect(state.consumableClaims).toHaveLength(1);
    expect(state.consumableClaims[0]).toMatchObject({
      consumableId: id,
      claimerId: "alice",
      amount: "1 gallon",
    });
    // Quantity is a free-text label the owner manages themselves; claiming
    // doesn't auto-decrement it (see Consumables.tsx submitClaim comment).
    expect(state.consumables[0].quantity).toBe("2 gallons");
  });

  it("supports multiple independent claims on the same listing", () => {
    state = postConsumable();
    const id = state.consumables[0].id;
    state = claim(id, "alice", "1 gallon");
    state = claim(id, "bob", "half a gallon");

    const claims = state.consumableClaims.filter((c) => c.consumableId === id);
    expect(claims).toHaveLength(2);
    expect(claims.map((c) => c.claimerId)).toEqual(["alice", "bob"]);
  });

  it("removing a consumable also removes its claims", () => {
    state = postConsumable();
    const id = state.consumables[0].id;
    state = claim(id, "alice", "1 gallon");

    state = {
      ...state,
      consumables: state.consumables.filter((c) => c.id !== id),
      consumableClaims: state.consumableClaims.filter((c) => c.consumableId !== id),
    };

    expect(state.consumables).toHaveLength(0);
    expect(state.consumableClaims).toHaveLength(0);
  });

  it("consumables are scoped per circle like items", () => {
    const circle2Id = uid();
    state = {
      ...state,
      circles: [...state.circles, { id: circle2Id, name: "Other", inviteCode: "OTH123", members: ["you"] }],
    };
    state = postConsumable({ circleId: state.circles[0].id });
    state = postConsumable({ circleId: circle2Id, title: "Scrap Lumber", quantity: "5 boards" });

    const inFirstCircle = state.consumables.filter((c) => c.circleId === state.circles[0].id);
    expect(inFirstCircle).toHaveLength(1);
    expect(inFirstCircle[0].title).toBe("Leftover Deck Paint");
  });

  it("a consumable posting has no due date or return concept (unlike Item/Loan)", () => {
    state = postConsumable();
    const posting = state.consumables[0];
    expect("startDate" in posting).toBe(false);
    expect("endDate" in posting).toBe(false);
    expect("status" in posting).toBe(false);
  });
});
