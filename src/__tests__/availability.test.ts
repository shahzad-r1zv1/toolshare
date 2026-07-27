import { describe, it, expect } from "vitest";
import {
  hasAvailability,
  formatAvailability,
  isOutsideAvailability,
} from "@/lib/helpers";
import type { Availability } from "@/lib/types";

describe("hasAvailability", () => {
  it("is false for undefined", () => {
    expect(hasAvailability(undefined)).toBe(false);
  });

  it("is false for an empty object", () => {
    expect(hasAvailability({})).toBe(false);
  });

  it("is false when every day has an empty slot array", () => {
    const availability: Availability = { Mon: [], Sat: [] };
    expect(hasAvailability(availability)).toBe(false);
  });

  it("is true when at least one day has at least one slot", () => {
    const availability: Availability = { Sat: ["Morning"] };
    expect(hasAvailability(availability)).toBe(true);
  });
});

describe("formatAvailability", () => {
  it("returns an empty string when there's no availability set", () => {
    expect(formatAvailability(undefined)).toBe("");
    expect(formatAvailability({})).toBe("");
  });

  it("formats a single day with a single slot", () => {
    const availability: Availability = { Sat: ["Morning"] };
    expect(formatAvailability(availability)).toBe("Sat: Morning");
  });

  it("groups multiple days that share identical slots", () => {
    const availability: Availability = {
      Sat: ["Morning", "Afternoon"],
      Sun: ["Morning", "Afternoon"],
    };
    expect(formatAvailability(availability)).toBe("Sat/Sun: Morning, Afternoon");
  });

  it("keeps days with different slot sets in separate groups", () => {
    const availability: Availability = {
      Sat: ["Morning"],
      Sun: ["Evening"],
    };
    const label = formatAvailability(availability);
    expect(label).toContain("Sat: Morning");
    expect(label).toContain("Sun: Evening");
  });

  it("preserves Mon-Sun ordering within a group regardless of input order", () => {
    const availability: Availability = {
      Sun: ["Evening"],
      Fri: ["Evening"],
      Mon: ["Evening"],
    };
    expect(formatAvailability(availability)).toBe("Mon/Fri/Sun: Evening");
  });

  it("ignores days with an explicitly empty slot list", () => {
    const availability: Availability = { Mon: [], Sat: ["Morning"] };
    expect(formatAvailability(availability)).toBe("Sat: Morning");
  });
});

describe("isOutsideAvailability", () => {
  it("is false when the item has no structured availability at all", () => {
    expect(isOutsideAvailability(undefined, "2026-03-14", "2026-03-15")).toBe(false);
    expect(isOutsideAvailability({}, "2026-03-14", "2026-03-15")).toBe(false);
  });

  it("is false for a single-day request that falls on an available day", () => {
    // 2026-03-14 is a Saturday.
    const availability: Availability = { Sat: ["Morning"] };
    expect(isOutsideAvailability(availability, "2026-03-14", "2026-03-14")).toBe(false);
  });

  it("is true for a single-day request that falls on a day with no slots", () => {
    // 2026-03-16 is a Monday.
    const availability: Availability = { Sat: ["Morning"], Sun: ["Morning"] };
    expect(isOutsideAvailability(availability, "2026-03-16", "2026-03-16")).toBe(true);
  });

  it("is true for a range that includes at least one unavailable day", () => {
    // Fri 2026-03-13 through Sun 2026-03-15: Friday isn't available.
    const availability: Availability = { Sat: ["Morning"], Sun: ["Morning"] };
    expect(isOutsideAvailability(availability, "2026-03-13", "2026-03-15")).toBe(true);
  });

  it("is false for a full weekend range when both Sat and Sun are available", () => {
    const availability: Availability = { Sat: ["Morning"], Sun: ["Morning"] };
    expect(isOutsideAvailability(availability, "2026-03-14", "2026-03-15")).toBe(false);
  });

  it("is false when the end date is before the start date (malformed range, not our job to flag)", () => {
    const availability: Availability = { Sat: ["Morning"] };
    expect(isOutsideAvailability(availability, "2026-03-15", "2026-03-14")).toBe(false);
  });

  it("does not consider the time-of-day slot, only whether the day has any slot", () => {
    // Owner only listed Saturday evenings; a Saturday request (any time) should not warn.
    const availability: Availability = { Sat: ["Evening"] };
    expect(isOutsideAvailability(availability, "2026-03-14", "2026-03-14")).toBe(false);
  });
});
