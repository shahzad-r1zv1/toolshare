"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { uid, now, DATE_FMT, findOverlappingLoan } from "@/lib/helpers";
import { useAppState } from "@/lib/store";
import type { Item, Request } from "@/lib/types";
import { LoadingScreen, Toast } from "@/components/ui";
import { MyCircle } from "@/components/MyCircle";
import { MyItems } from "@/components/MyItems";
import { Requests } from "@/components/Requests";
import { LoanHistory } from "@/components/LoanHistory";
import { Wishlist } from "@/components/Wishlist";
import { DetailsModal } from "@/components/DetailsModal";
import { CircleForms, CircleManagerModal, InviteModal } from "@/components/CircleManager";

type Tab = "circle" | "items" | "reqs" | "wishlist" | "history";

const TAB_CONFIG: { key: Tab; label: string; icon: React.ReactNode }[] = [
  {
    key: "circle",
    label: "Circle",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    key: "items",
    label: "My Items",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    key: "reqs",
    label: "Requests",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  {
    key: "wishlist",
    label: "Wishlist",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    ),
  },
  {
    key: "history",
    label: "History",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function Page() {
  const { user, loading, error: authError, signOut } = useAuth();
  const router = useRouter();
  const { state, setState, ready, mode, syncError, createCircle, joinCircle, leaveCircle } =
    useAppState(user);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  const [tab, setTab] = useState<Tab>("circle");
  const [activeCircleId, setActiveCircleId] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [detailsFor, setDetailsFor] = useState<Item | null>(null);
  const [circlesOpen, setCirclesOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [offlineBannerDismissed, setOfflineBannerDismissed] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  // Keep the active circle valid as circles arrive, change, or are joined.
  useEffect(() => {
    if (!state.circles.some((c) => c.id === activeCircleId)) {
      setActiveCircleId(state.circles[0]?.id || "");
    }
  }, [state.circles, activeCircleId]);

  const activeCircle = state.circles.find((c) => c.id === activeCircleId);
  const categories = Array.from(
    new Set(
      state.items
        .filter((i) => i.circleId === activeCircleId)
        .map((i) => i.category)
        .filter(Boolean)
    )
  ) as string[];

  const pendingRequestCount = state.requests.filter(
    (r) =>
      r.status === "PENDING" &&
      state.items.some(
        (i) => i.id === r.itemId && i.ownerId === state.user.id
      )
  ).length;

  const activeLoansCount = state.loans.filter(
    (l) => l.status === "ACTIVE"
  ).length;

  const onOpenDetails = useCallback((item: Item) => setDetailsFor(item), []);
  const onCloseDetails = () => setDetailsFor(null);

  const handleRequest = (start: string, end: string) => {
    if (!detailsFor) return;
    const conflict = findOverlappingLoan(state.loans, detailsFor.id, start, end);
    if (conflict) {
      setToast({
        message: `"${detailsFor.title}" is already booked ${DATE_FMT(conflict.startDate)} → ${DATE_FMT(conflict.endDate)}.`,
        type: "error",
      });
      return;
    }
    const req: Request = {
      id: uid(),
      itemId: detailsFor.id,
      borrowerId: state.user.id,
      startDate: start,
      endDate: end,
      status: "PENDING",
      createdAt: now(),
    };
    setState((s) => ({ ...s, requests: [req, ...s.requests] }));
    setDetailsFor(null);
    setToast({
      message: `Request sent for "${detailsFor.title}"`,
      type: "success",
    });
  };

  const copyInviteCode = async () => {
    if (!activeCircle) return;
    try {
      await navigator.clipboard.writeText(activeCircle.inviteCode);
      setToast({ message: "Invite code copied — share it with friends!", type: "success" });
    } catch {
      setToast({ message: `Invite code: ${activeCircle.inviteCode}`, type: "info" });
    }
  };

  if (loading || !user || !ready) {
    return <LoadingScreen />;
  }

  const hasCircles = state.circles.length > 0;

  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* Header */}
      <header className="relative bg-surface sticky top-0 z-10 shadow-[0_1px_0_hsl(var(--shadow-color)/0.3)]">
        <div className="absolute top-0 left-0 right-0 h-[3px] hazard-edge" />
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 pt-[19px]">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-display font-extrabold tracking-tight text-ink">
              Tool<span className="text-accent">Share</span>
            </h1>
            {hasCircles && (
              <select
                className="bg-surface-sunken border border-border text-sm rounded-lg px-2 py-1 text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                value={activeCircleId}
                onChange={(e) => setActiveCircleId(e.target.value)}
                aria-label="Select circle"
              >
                {state.circles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            {activeCircle && (
              <button
                onClick={() => setInviteOpen(true)}
                className="text-xs text-ink-faint hover:text-ink-muted transition-colors"
                title="Click to view invite code and QR"
              >
                Code:{" "}
                <span className="font-tag text-ink-muted">
                  {activeCircle.inviteCode}
                </span>
              </button>
            )}
            <button
              onClick={() => setCirclesOpen(true)}
              className="px-2 py-1 text-xs font-medium bg-surface-sunken hover:bg-surface-raised border border-border text-ink-muted hover:text-ink rounded-lg transition-colors"
              aria-label="Manage circles"
            >
              + Circles
            </button>
            {mode === "local" && (
              <span
                className="flex items-center gap-1 text-[10px] font-tag uppercase bg-warn-soft text-warn border border-warn/50 px-2 py-0.5 rounded-full tag-pulse"
                title="Firebase is not configured; data stays on this device only and can't be shared with others."
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                Offline demo — not shared
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {user.photoURL && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt={user.displayName || "User"}
                className="w-8 h-8 rounded-full border border-border"
                referrerPolicy="no-referrer"
              />
            )}
            <span className="text-sm text-ink-muted hidden sm:inline">
              {user.displayName || user.email}
            </span>
            <button
              onClick={signOut}
              className="px-3 py-1.5 text-sm font-medium bg-surface-sunken hover:bg-surface-raised border border-border text-ink rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
              aria-label="Sign out"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {(authError || syncError) && (
        <div className="bg-bad-soft border-b border-bad/40 px-4 py-3 text-center">
          <p className="text-sm text-bad">{authError || syncError}</p>
        </div>
      )}

      {mode === "local" && !offlineBannerDismissed && (
        <div className="bg-warn-soft border-b border-warn/40 px-4 py-3">
          <div className="max-w-5xl mx-auto flex items-start sm:items-center justify-between gap-3">
            <p className="text-sm text-ink">
              <b className="text-warn">Offline demo mode.</b> Firebase isn&apos;t configured, so
              everything you add here stays on this device only — nothing is
              shared with your circle, and you can&apos;t join circles
              created by others.
            </p>
            <button
              onClick={() => setOfflineBannerDismissed(true)}
              className="shrink-0 text-warn hover:brightness-110 text-sm px-2 py-1 font-medium"
              aria-label="Dismiss"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {!hasCircles ? (
        /* First-run: no circles yet — create or join one. */
        <main className="p-4 max-w-md mx-auto mt-8">
          <div className="relative bg-surface border border-border rounded-xl p-6 overflow-hidden shadow-[0_1px_2px_hsl(var(--shadow-color)/0.25)]">
            <div className="absolute top-0 left-0 right-0 h-[3px] hazard-edge" />
            <h2 className="text-lg font-display font-bold mb-1 pt-1 text-ink">
              Welcome{state.user.name ? `, ${state.user.name}` : ""}! 👋
            </h2>
            <p className="text-sm text-ink-muted mb-5">
              ToolShare works in circles — small trusted groups that share
              tools with each other. Create your first circle, or join a
              friend&apos;s with their invite code.
            </p>
            <CircleForms
              createCircle={createCircle}
              joinCircle={joinCircle}
              canJoin={mode === "cloud"}
              onDone={(message) => setToast({ message, type: "success" })}
            />
          </div>
        </main>
      ) : (
        <main className="p-4 max-w-5xl mx-auto">
          {/* Search & Filter */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                aria-label="Search tools"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tools..."
                className="w-full pl-10 pr-3 py-2 bg-surface border border-border rounded-lg text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
            <select
              aria-label="Filter by category"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-accent"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Tab Navigation */}
          <nav className="flex gap-1 mb-6 border-b border-border pb-1" role="tablist">
            {TAB_CONFIG.map(({ key, label, icon }) => {
              const isActive = tab === key;
              const badge =
                key === "reqs" ? pendingRequestCount + activeLoansCount : 0;
              return (
                <button
                  key={key}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
                    isActive
                      ? "bg-accent text-accent-ink"
                      : "text-ink-muted hover:text-ink hover:bg-surface"
                  }`}
                >
                  {icon}
                  <span className="hidden sm:inline">{label}</span>
                  {badge > 0 && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center font-tag ${
                        isActive
                          ? "bg-accent-ink/20 text-accent-ink"
                          : "bg-accent text-accent-ink"
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Tab Content */}
          <div role="tabpanel">
            {tab === "circle" && (
              <MyCircle
                state={state}
                activeCircleId={activeCircleId}
                search={search}
                filter={filter}
                onOpenDetails={onOpenDetails}
              />
            )}
            {tab === "items" && (
              <MyItems
                state={state}
                setState={setState}
                activeCircleId={activeCircleId}
              />
            )}
            {tab === "reqs" && (
              <Requests
                state={state}
                setState={setState}
                search={search}
                filter={filter}
              />
            )}
            {tab === "wishlist" && (
              <Wishlist
                state={state}
                setState={setState}
                activeCircleId={activeCircleId}
                search={search}
              />
            )}
            {tab === "history" && (
              <LoanHistory state={state} search={search} filter={filter} />
            )}
          </div>
        </main>
      )}

      {/* Circle management modal */}
      {circlesOpen && (
        <CircleManagerModal
          circles={state.circles}
          createCircle={createCircle}
          joinCircle={joinCircle}
          leaveCircle={leaveCircle}
          canJoin={mode === "cloud"}
          onClose={() => setCirclesOpen(false)}
          onDone={(message) => setToast({ message, type: "success" })}
        />
      )}

      {/* Invite modal (QR code + code for joining this circle) */}
      {inviteOpen && activeCircle && (
        <InviteModal
          circleName={activeCircle.name}
          inviteCode={activeCircle.inviteCode}
          onClose={() => setInviteOpen(false)}
          onCopy={copyInviteCode}
        />
      )}

      {/* Details Modal */}
      {detailsFor && (
        <DetailsModal
          item={detailsFor}
          isOwnItem={state.user.id === detailsFor.ownerId}
          onClose={onCloseDetails}
          onRequest={handleRequest}
        />
      )}

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
