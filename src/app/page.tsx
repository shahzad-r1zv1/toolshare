"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { load, save, seed, uid, now } from "@/lib/helpers";
import type { State, Item, Request } from "@/lib/types";
import { LoadingScreen, Toast } from "@/components/ui";
import { MyCircle } from "@/components/MyCircle";
import { MyItems } from "@/components/MyItems";
import { Requests } from "@/components/Requests";
import { LoanHistory } from "@/components/LoanHistory";
import { DetailsModal } from "@/components/DetailsModal";

type Tab = "circle" | "items" | "reqs" | "history";

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
  const [state, setState] = useState<State>(() => load() || seed());
  useEffect(() => save(state), [state]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  const [tab, setTab] = useState<Tab>("circle");
  const [activeCircleId, setActiveCircleId] = useState(
    state.user.circles[0] || state.circles[0]?.id || ""
  );
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [detailsFor, setDetailsFor] = useState<Item | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

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

  if (loading || !user) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-black text-gray-100">
      {/* Header */}
      <header className="p-4 border-b border-gray-800 bg-gray-900 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">ToolShare</h1>
            <select
              className="bg-gray-800 text-sm rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
            {activeCircle && (
              <span className="text-xs text-gray-500 hidden sm:inline">
                Code:{" "}
                <span className="font-mono text-gray-400">
                  {activeCircle.inviteCode}
                </span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {user.photoURL && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt={user.displayName || "User"}
                className="w-8 h-8 rounded-full"
                referrerPolicy="no-referrer"
              />
            )}
            <span className="text-sm text-gray-300 hidden sm:inline">
              {user.displayName || user.email}
            </span>
            <button
              onClick={signOut}
              className="px-3 py-1 text-sm bg-gray-800 hover:bg-gray-700 text-gray-100 rounded-2xl transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400"
              aria-label="Sign out"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {authError && (
        <div className="bg-red-900/30 border-b border-red-800 px-4 py-3 text-center">
          <p className="text-sm text-red-300">{authError}</p>
        </div>
      )}

      <main className="p-4 max-w-5xl mx-auto">
        {/* Search & Filter */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
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
              className="w-full pl-10 pr-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
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
            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
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
        <nav className="flex gap-1 mb-6 border-b border-gray-800 pb-1" role="tablist">
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
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  isActive
                    ? "bg-gray-900 text-emerald-400 border-b-2 border-emerald-400"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-900/50"
                }`}
              >
                {icon}
                <span className="hidden sm:inline">{label}</span>
                {badge > 0 && (
                  <span className="bg-emerald-600 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
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
          {tab === "history" && (
            <LoanHistory state={state} search={search} filter={filter} />
          )}
        </div>
      </main>

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
