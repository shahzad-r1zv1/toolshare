"use client";

import React from "react";
import { Card, Button, Avatar, EmptyState, ItemPhoto } from "./ui";
import { distanceLabel, findOutstandingLoan } from "@/lib/helpers";
import type { State, Item } from "@/lib/types";

/**
 * Searches items across every circle the user belongs to, not just the
 * active one — "does anyone in my network have X" rather than "does this
 * circle have X".
 */
export function NetworkSearchResults({
  state,
  search,
  onOpenDetails,
}: {
  state: State;
  search: string;
  onOpenDetails: (item: Item) => void;
}) {
  const findUser = (id: string) =>
    [state.user, ...state.friends].find((u) => u.id === id);
  const findCircleName = (circleId: string) =>
    state.circles.find((c) => c.id === circleId)?.name || "Unknown circle";

  const results = state.items
    .filter((i) => !i.archived)
    .filter((i) => i.title.toLowerCase().includes(search.toLowerCase()));

  if (!search) {
    return (
      <EmptyState
        title="Search your network"
        description="Type a tool name above to see who among all your circles has it — not just this one."
      />
    );
  }

  if (results.length === 0) {
    return (
      <EmptyState
        title="No matches in your network"
        description={`Nobody across your circles has a tool matching "${search}".`}
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-faint font-tag uppercase tracking-wide">
        {results.length} {results.length === 1 ? "match" : "matches"} across your circles
      </p>
      {results.map((item) => {
        const owner = findUser(item.ownerId);
        const isOut = Boolean(findOutstandingLoan(state.loans, item.id));
        const distance =
          item.ownerId === state.user.id
            ? undefined
            : distanceLabel(state.user.location, owner?.location);
        return (
          <Card key={item.id}>
            <div className="flex items-center gap-3">
              <ItemPhoto src={item.photos[0]} alt={item.title} />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate text-ink">{item.title}</div>
                <div className="text-xs text-ink-muted flex items-center gap-1.5 flex-wrap">
                  <Avatar name={owner?.name || "?"} />
                  <span>{owner?.name || "Someone"}</span>
                  <span>· {findCircleName(item.circleId)}</span>
                  {distance && <span>· {distance}</span>}
                  {isOut && <span className="text-warn">· currently out</span>}
                </div>
              </div>
              <Button kind="ghost" onClick={() => onOpenDetails(item)}>
                Details
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
