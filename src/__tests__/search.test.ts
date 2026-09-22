import { describe, it, expect } from "vitest";
import { matchesQuery } from "@/lib/search";

describe("matchesQuery", () => {
  it("matches case-insensitively on title", () => {
    expect(matchesQuery({ title: "Cordless Drill" }, "drill")).toBe(true);
    expect(matchesQuery({ title: "Cordless Drill" }, "DRILL")).toBe(true);
  });

  it("matches substrings anywhere in the title", () => {
    expect(matchesQuery({ title: "Cordless Drill" }, "less dr")).toBe(true);
  });

  it("does not match unrelated text", () => {
    expect(matchesQuery({ title: "Cordless Drill" }, "ladder")).toBe(false);
  });

  it("treats an empty or blank query as matching everything", () => {
    expect(matchesQuery({ title: "Cordless Drill" }, "")).toBe(true);
    expect(matchesQuery({ title: "Cordless Drill" }, "   ")).toBe(true);
  });
});
