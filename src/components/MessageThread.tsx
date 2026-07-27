"use client";

import React, { useState } from "react";
import { Button, Modal, Avatar } from "./ui";
import { uid, now } from "@/lib/helpers";
import type { State, Message } from "@/lib/types";

/** Small button that opens a message thread modal, showing an unread-style count. */
export function MessageButton({
  state,
  setState,
  threadId,
  otherPartyName,
}: {
  state: State;
  setState: React.Dispatch<React.SetStateAction<State>>;
  threadId: string;
  otherPartyName: string;
}) {
  const [open, setOpen] = useState(false);
  const count = state.messages.filter((m) => m.threadId === threadId).length;

  return (
    <>
      <Button kind="secondary" onClick={() => setOpen(true)}>
        Message{count > 0 ? ` (${count})` : ""}
      </Button>
      {open && (
        <MessageThreadModal
          state={state}
          setState={setState}
          threadId={threadId}
          otherPartyName={otherPartyName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function MessageThreadModal({
  state,
  setState,
  threadId,
  otherPartyName,
  onClose,
}: {
  state: State;
  setState: React.Dispatch<React.SetStateAction<State>>;
  threadId: string;
  otherPartyName: string;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const you = state.user.id;
  const findUser = (id: string) =>
    [state.user, ...state.friends].find((u) => u.id === id);

  const thread = state.messages
    .filter((m) => m.threadId === threadId)
    .sort((a, b) => a.createdAt - b.createdAt);

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const message: Message = {
      id: uid(),
      threadId,
      senderId: you,
      text: trimmed,
      createdAt: now(),
    };
    setState((s) => ({ ...s, messages: [...s.messages, message] }));
    setText("");
  };

  return (
    <Modal title={`Messages with ${otherPartyName}`} onClose={onClose}>
      <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
        {thread.length === 0 && (
          <p className="text-sm text-ink-faint italic text-center py-6">
            No messages yet — say hello!
          </p>
        )}
        {thread.map((m) => {
          const isMine = m.senderId === you;
          const sender = findUser(m.senderId);
          return (
            <div
              key={m.id}
              className={`flex gap-2 items-end ${isMine ? "flex-row-reverse" : ""}`}
            >
              <Avatar name={sender?.name || "?"} />
              <div
                className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm border-2 border-border ${
                  isMine ? "bg-accent text-accent-ink" : "bg-surface-sunken text-ink"
                }`}
              >
                {m.text}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 pt-1">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          placeholder="Write a message…"
          className="flex-1 px-3 py-2 bg-surface-sunken border-2 border-border rounded-2xl text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent"
          autoFocus
        />
        <Button onClick={send} disabled={!text.trim()}>
          Send
        </Button>
      </div>
    </Modal>
  );
}
