"use client";

import React, { useMemo } from "react";
import { Avatar, Card, Button, EmptyState, ItemPhoto } from "./ui";
import type { State, Item } from "@/lib/types";

export function MyCircle({
  state,
  activeCircleId,
  search,
  filter,
  onOpenDetails,
}: {
  state: State;
  activeCircleId: string;
  search: string;
  filter: string;
  onOpenDetails: (item: Item) => void;
}) {
  const members = useMemo(() => {
    const ids =
      state.circles.find((c) => c.id === activeCircleId)?.members || [];
    return [state.user, ...state.friends].filter((m) => ids.includes(m.id));
  }, [state, activeCircleId]);

  const itemsByMember = (memberId: string) =>
    state.items
      .filter(
        (i) => i.circleId === activeCircleId && i.ownerId === memberId
      )
      .filter((i) =>
        i.title.toLowerCase().includes(search.toLowerCase())
      )
      .filter((i) => !filter || i.category === filter);

  const totalItems = members.reduce(
    (sum, m) => sum + itemsByMember(m.id).length,
    0
  );

  if (members.length === 0) {
    return (
      <EmptyState
        icon={
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        }
        title="No circle members"
        description="Create or join a circle to start sharing tools with friends and family."
      />
    );
  }

  if (totalItems === 0 && (search || filter)) {
    return (
      <EmptyState
        icon={
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        }
        title="No matching tools"
        description={`No tools match "${search}"${filter ? ` in ${filter}` : ""}. Try adjusting your search or filters.`}
      />
    );
  }

  return (
    <div className="space-y-6">
      {members.map((m) => {
        const owned = itemsByMember(m.id);
        if (owned.length === 0 && (search || filter)) return null;
        return (
          <div key={m.id}>
            <div className="flex items-center gap-2 mb-3">
              <Avatar name={m.name} />
              <h2 className="font-semibold">{m.name}</h2>
              <span className="text-xs text-gray-500">
                {owned.length} {owned.length === 1 ? "tool" : "tools"}
              </span>
            </div>
            {owned.length === 0 && (
              <p className="text-sm text-gray-500 italic ml-10">
                No tools shared yet
              </p>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              {owned.map((item) => (
                <Card key={item.id}>
                  <div className="flex gap-3 items-center">
                    <ItemPhoto src={item.photos[0]} alt={item.title} size="lg" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.title}</div>
                      {item.category && (
                        <div className="text-xs text-gray-400">
                          {item.category}
                        </div>
                      )}
                      {item.avail && (
                        <div className="text-xs text-gray-500">
                          {item.avail}
                        </div>
                      )}
                    </div>
                    <Button kind="ghost" onClick={() => onOpenDetails(item)}>
                      Details
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
