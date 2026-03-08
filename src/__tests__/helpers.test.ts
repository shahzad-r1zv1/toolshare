import { describe, it, expect, beforeEach } from "vitest";
import { uid, now, DATE_FMT, load, save, seed, filesTo64 } from "@/lib/helpers";

describe("helpers", () => {
  describe("uid", () => {
    it("returns a non-empty string", () => {
      const id = uid();
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    });

    it("generates unique values", () => {
      const ids = new Set(Array.from({ length: 100 }, () => uid()));
      expect(ids.size).toBe(100);
    });
  });

  describe("now", () => {
    it("returns a positive number", () => {
      const ts = now();
      expect(typeof ts).toBe("number");
      expect(ts).toBeGreaterThan(0);
    });
  });

  describe("DATE_FMT", () => {
    it("formats a date string", () => {
      const formatted = DATE_FMT("2026-03-10");
      expect(typeof formatted).toBe("string");
      expect(formatted.length).toBeGreaterThan(0);
    });
  });

  describe("load / save", () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it("returns null when nothing is stored", () => {
      expect(load()).toBeNull();
    });

    it("roundtrips state through localStorage", () => {
      const state = seed();
      save(state);
      const loaded = load();
      expect(loaded).toEqual(state);
    });

    it("preserves all state fields", () => {
      const state = seed();
      save(state);
      const loaded = load()!;
      expect(loaded.user).toBeDefined();
      expect(loaded.friends).toBeDefined();
      expect(loaded.circles).toBeDefined();
      expect(loaded.items).toBeDefined();
      expect(loaded.requests).toBeDefined();
      expect(loaded.loans).toBeDefined();
    });
  });

  describe("seed", () => {
    it("creates a valid initial state", () => {
      const state = seed();
      expect(state.user.id).toBe("you");
      expect(state.user.name).toBe("You");
      expect(state.friends.length).toBe(2);
      expect(state.circles.length).toBe(1);
      expect(state.items.length).toBe(2);
      expect(state.requests).toEqual([]);
      expect(state.loans).toEqual([]);
    });

    it("connects user to circle", () => {
      const state = seed();
      const circle = state.circles[0];
      expect(state.user.circles).toContain(circle.id);
      expect(circle.members).toContain(state.user.id);
    });

    it("gives circle members correct IDs", () => {
      const state = seed();
      const circle = state.circles[0];
      expect(circle.members).toContain("you");
      expect(circle.members).toContain("alice");
      expect(circle.members).toContain("bob");
    });

    it("assigns items to correct owners", () => {
      const state = seed();
      const userItems = state.items.filter((i) => i.ownerId === "you");
      const aliceItems = state.items.filter((i) => i.ownerId === "alice");
      expect(userItems.length).toBe(1);
      expect(aliceItems.length).toBe(1);
      expect(userItems[0].title).toBe("Spray Painter");
      expect(aliceItems[0].title).toBe("18V Drill + Bits");
    });

    it("creates a circle with an invite code", () => {
      const state = seed();
      expect(state.circles[0].inviteCode).toMatch(/^FAM-/);
    });
  });

  describe("filesTo64", () => {
    it("returns empty array for empty input", async () => {
      const result = await filesTo64([]);
      expect(result).toEqual([]);
    });
  });
});
