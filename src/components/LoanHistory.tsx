"use client";

import React from "react";
import { Card, EmptyState, ItemPhoto } from "./ui";
import { DATE_FMT } from "@/lib/helpers";
import type { State } from "@/lib/types";

export function LoanHistory({
  state,
  search,
  filter,
}: {
  state: State;
  search: string;
  filter: string;
}) {
  const findItem = (id: string) => state.items.find((i) => i.id === id);
  const findUser = (id: string) =>
    [state.user, ...state.friends].find((u) => u.id === id);

  const history = state.loans
    .filter((l) => l.status === "RETURNED")
    .filter((l) => {
      const it = findItem(l.itemId);
      if (!it) return false;
      return (
        it.title.toLowerCase().includes(search.toLowerCase()) &&
        (!filter || it.category === filter)
      );
    });

  if (history.length === 0 && !search && !filter) {
    return (
      <EmptyState
        icon={
          <svg
            className="w-12 h-12"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        }
        title="No loan history yet"
        description="Completed loans will appear here for your records."
      />
    );
  }

  if (history.length === 0) {
    return (
      <EmptyState
        icon={
          <svg
            className="w-12 h-12"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        }
        title="No matching history"
        description="Try adjusting your search or filters."
      />
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-lg">
        Loan History
        <span className="text-xs text-gray-500 font-normal ml-2">
          {history.length} {history.length === 1 ? "record" : "records"}
        </span>
      </h3>
      {history.map((l) => {
        const item = findItem(l.itemId);
        const borrower = findUser(l.borrowerId);
        return (
          <Card key={l.id}>
            <div className="flex items-center gap-3">
              <ItemPhoto src={item?.photos[0]} alt={item?.title || ""} />
              <div className="min-w-0">
                <div className="truncate">
                  <b>{item?.title}</b> was borrowed by{" "}
                  <b>{borrower?.name}</b>
                </div>
                <div className="text-xs text-gray-400">
                  {DATE_FMT(l.startDate)} → {DATE_FMT(l.endDate)}
                </div>
                {l.returnNotes && (
                  <div className="text-xs text-gray-300 mt-1">
                    Notes: {l.returnNotes}
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
