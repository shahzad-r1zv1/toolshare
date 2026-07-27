import { describe, it, expect, beforeEach } from "vitest";
import {
  JOIN_PARAM,
  inviteUrl,
  capturePendingJoinCode,
  takePendingJoinCode,
} from "@/components/InviteQRCode";

/**
 * The QR code must open the app itself (so a scan lands a signed-out
 * person on login, then auto-joins), not just encode the bare invite code.
 * These tests cover the URL-building and the sessionStorage handoff that
 * lets the join survive the /  -> /login -> / redirect round trip.
 */

describe("inviteUrl", () => {
  it("builds a URL pointing at the app's own origin with the join param set", () => {
    const url = inviteUrl("ABC123");
    const parsed = new URL(url);
    expect(parsed.origin).toBe(window.location.origin);
    expect(parsed.searchParams.get(JOIN_PARAM)).toBe("ABC123");
  });

  it("does not include any other query params", () => {
    const url = inviteUrl("XYZ789");
    const parsed = new URL(url);
    expect([...parsed.searchParams.keys()]).toEqual([JOIN_PARAM]);
  });
});

describe("capturePendingJoinCode / takePendingJoinCode", () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("does nothing when there is no join param in the URL", () => {
    window.history.replaceState({}, "", "/");
    capturePendingJoinCode();
    expect(takePendingJoinCode()).toBeNull();
  });

  it("captures a join code from the URL into storage", () => {
    window.history.replaceState({}, "", `/?${JOIN_PARAM}=FAM123`);
    capturePendingJoinCode();
    expect(takePendingJoinCode()).toBe("FAM123");
  });

  it("strips the join param from the visible URL after capturing", () => {
    window.history.replaceState({}, "", `/?${JOIN_PARAM}=FAM123`);
    capturePendingJoinCode();
    expect(window.location.search).not.toContain(JOIN_PARAM);
  });

  it("preserves other query params while stripping only the join param", () => {
    window.history.replaceState({}, "", `/?foo=bar&${JOIN_PARAM}=FAM123`);
    capturePendingJoinCode();
    expect(window.location.search).toContain("foo=bar");
    expect(window.location.search).not.toContain(JOIN_PARAM);
  });

  it("takePendingJoinCode clears the code after reading it (one-time use)", () => {
    window.history.replaceState({}, "", `/?${JOIN_PARAM}=FAM123`);
    capturePendingJoinCode();
    expect(takePendingJoinCode()).toBe("FAM123");
    expect(takePendingJoinCode()).toBeNull();
  });

  it("a later capture with no join param does not clear a previously stashed code", () => {
    window.history.replaceState({}, "", `/?${JOIN_PARAM}=FAM123`);
    capturePendingJoinCode();
    // Simulates landing on /login next, with no join param this time.
    window.history.replaceState({}, "", "/login");
    capturePendingJoinCode();
    expect(takePendingJoinCode()).toBe("FAM123");
  });
});
