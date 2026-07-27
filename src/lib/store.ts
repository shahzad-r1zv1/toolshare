"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User as FirebaseUser } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "./firebase";
import { load, save, seed, uid } from "./helpers";
import type {
  State,
  Item,
  Request,
  Loan,
  Friend,
  WishlistEntry,
  Message,
  WaitlistEntry,
  Consumable,
  ConsumableClaim,
  RoughLocation,
} from "./types";

/**
 * Firestore data model: one document per circle in the `circles` collection.
 * Each doc holds the circle's membership and all shared data (items,
 * requests, loans). Every member subscribes to the docs of their circles,
 * so changes propagate to the whole circle in real time.
 */
export type CircleDoc = {
  name: string;
  inviteCode: string;
  memberIds: string[];
  memberProfiles: Record<string, { name: string; location?: RoughLocation }>;
  items: Item[];
  requests: Request[];
  loans: Loan[];
  wishlist: WishlistEntry[];
  messages: Message[];
  waitlist: WaitlistEntry[];
  consumables: Consumable[];
  consumableClaims: ConsumableClaim[];
  updatedAt: number;
};

/** Invite codes avoid ambiguous characters (0/O, 1/I/L). */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const makeInviteCode = () =>
  Array.from(
    { length: 6 },
    () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  ).join("");

export const normalizeInviteCode = (code: string) =>
  code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");

/** JSON round-trip strips `undefined` fields, which Firestore rejects. */
const clean = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const stableStringify = (value: unknown): string =>
  JSON.stringify(value, (_key, val) =>
    val && typeof val === "object" && !Array.isArray(val)
      ? Object.keys(val as Record<string, unknown>)
          .sort()
          .reduce((acc, k) => {
            acc[k] = (val as Record<string, unknown>)[k];
            return acc;
          }, {} as Record<string, unknown>)
      : val
  );

export function displayNameOf(user: FirebaseUser): string {
  return user.displayName || user.email?.split("@")[0] || "You";
}

/** Build the app's State shape from the circle docs the user belongs to. */
export function assembleState(
  uid_: string,
  name: string,
  docs: Record<string, CircleDoc>
): State {
  const circleIds = Object.keys(docs);
  const friendMap = new Map<string, Friend>();
  const items: Item[] = [];
  const requests: Request[] = [];
  const loans: Loan[] = [];
  const wishlist: WishlistEntry[] = [];
  const messages: Message[] = [];
  const waitlist: WaitlistEntry[] = [];
  const consumables: Consumable[] = [];
  const consumableClaims: ConsumableClaim[] = [];
  let myLocation: RoughLocation | undefined;
  for (const id of circleIds) {
    const d = docs[id];
    for (const memberId of d.memberIds) {
      if (memberId === uid_) {
        myLocation = myLocation || d.memberProfiles?.[memberId]?.location;
        continue;
      }
      if (!friendMap.has(memberId)) {
        friendMap.set(memberId, {
          id: memberId,
          name: d.memberProfiles?.[memberId]?.name || "Member",
          location: d.memberProfiles?.[memberId]?.location,
        });
      }
    }
    items.push(...(d.items || []));
    requests.push(...(d.requests || []));
    loans.push(...(d.loans || []));
    wishlist.push(...(d.wishlist || []));
    messages.push(...(d.messages || []));
    waitlist.push(...(d.waitlist || []));
    consumables.push(...(d.consumables || []));
    consumableClaims.push(...(d.consumableClaims || []));
  }
  return {
    user: { id: uid_, name, circles: circleIds, location: myLocation },
    friends: [...friendMap.values()],
    circles: circleIds.map((id) => ({
      id,
      name: docs[id].name,
      inviteCode: docs[id].inviteCode,
      members: docs[id].memberIds,
    })),
    items: items.sort((a, b) => b.createdAt - a.createdAt),
    requests: requests.sort((a, b) => b.createdAt - a.createdAt),
    loans,
    wishlist: wishlist.sort((a, b) => b.createdAt - a.createdAt),
    messages: messages.sort((a, b) => a.createdAt - b.createdAt),
    waitlist: waitlist.sort((a, b) => a.createdAt - b.createdAt),
    consumables: consumables.sort((a, b) => b.createdAt - a.createdAt),
    consumableClaims: consumableClaims.sort((a, b) => a.createdAt - b.createdAt),
  };
}

/**
 * Distribute a State back into per-circle docs. Items carry their circleId;
 * requests and loans follow their item's circle, falling back to the doc
 * they previously lived in if the item has been deleted.
 */
export function splitState(
  state: State,
  prevDocs: Record<string, CircleDoc>
): Record<string, CircleDoc> {
  const itemCircle = new Map<string, string>();
  for (const item of state.items) itemCircle.set(item.id, item.circleId);

  const prevHome = (
    entityId: string,
    kind: "requests" | "loans" | "waitlist" | "messages" | "consumableClaims"
  ): string | undefined => {
    for (const [circleId, d] of Object.entries(prevDocs)) {
      if ((d[kind] || []).some((e: { id: string }) => e.id === entityId)) return circleId;
    }
    return undefined;
  };

  const result: Record<string, CircleDoc> = {};
  for (const circle of state.circles) {
    const prev = prevDocs[circle.id];
    result[circle.id] = {
      name: circle.name,
      inviteCode: circle.inviteCode,
      memberIds: circle.members,
      memberProfiles: prev?.memberProfiles || {},
      items: [],
      requests: [],
      loans: [],
      wishlist: [],
      messages: [],
      waitlist: [],
      consumables: [],
      consumableClaims: [],
      updatedAt: Date.now(),
    };
    // Keep profile names (and location) for current members; the user's own
    // profile is refreshed elsewhere (create/join/location settings).
    for (const f of state.friends) {
      if (circle.members.includes(f.id) && !result[circle.id].memberProfiles[f.id]) {
        result[circle.id].memberProfiles[f.id] = { name: f.name, location: f.location };
      }
    }
    if (circle.members.includes(state.user.id) && !result[circle.id].memberProfiles[state.user.id]) {
      result[circle.id].memberProfiles[state.user.id] = {
        name: state.user.name,
        location: state.user.location,
      };
    }
  }
  for (const item of state.items) {
    result[item.circleId]?.items.push(item);
  }
  for (const r of state.requests) {
    const home = itemCircle.get(r.itemId) || prevHome(r.id, "requests");
    if (home && result[home]) result[home].requests.push(r);
  }
  for (const l of state.loans) {
    const home = itemCircle.get(l.itemId) || prevHome(l.id, "loans");
    if (home && result[home]) result[home].loans.push(l);
  }
  for (const w of state.wishlist) {
    result[w.circleId]?.wishlist.push(w);
  }
  for (const w of state.waitlist) {
    const home = itemCircle.get(w.itemId) || prevHome(w.id, "waitlist");
    if (home && result[home]) result[home].waitlist.push(w);
  }
  // A message's thread id is either a request id or a loan id; resolve
  // through whichever one currently exists to find the owning item/circle.
  const requestItemId = new Map(state.requests.map((r) => [r.id, r.itemId]));
  const loanItemId = new Map(state.loans.map((l) => [l.id, l.itemId]));
  for (const m of state.messages) {
    const itemId = requestItemId.get(m.threadId) || loanItemId.get(m.threadId);
    const home = (itemId && itemCircle.get(itemId)) || prevHome(m.id, "messages");
    if (home && result[home]) result[home].messages.push(m);
  }
  for (const c of state.consumables) {
    result[c.circleId]?.consumables.push(c);
  }
  const consumableCircle = new Map(state.consumables.map((c) => [c.id, c.circleId]));
  for (const claim of state.consumableClaims) {
    const home =
      consumableCircle.get(claim.consumableId) || prevHome(claim.id, "consumableClaims");
    if (home && result[home]) result[home].consumableClaims.push(claim);
  }
  return result;
}

export interface AppStore {
  state: State;
  /** Same contract as React's setState; components keep working unchanged. */
  setState: React.Dispatch<React.SetStateAction<State>>;
  /** False until the first data snapshot has arrived. */
  ready: boolean;
  /** "cloud" = Firestore-backed shared data; "local" = this-device-only demo. */
  mode: "cloud" | "local";
  syncError: string | null;
  createCircle: (name: string) => Promise<void>;
  joinCircle: (code: string) => Promise<void>;
  /** Leave a circle: fails if the user has an item on active loan or a loan out on someone else's item within it. */
  leaveCircle: (circleId: string) => Promise<void>;
}

export function useAppState(user: FirebaseUser | null): AppStore {
  const mode: "cloud" | "local" = db && user && user.uid !== "dev-user" ? "cloud" : "local";
  const userId = user?.uid || "dev-user";
  const userName = user ? displayNameOf(user) : "You";

  // ----- local (offline demo) mode -----
  const [localState, setLocalState] = useState<State>(() => load() || seed());
  useEffect(() => {
    if (mode === "local") save(localState);
  }, [localState, mode]);

  // ----- cloud (Firestore) mode -----
  const [docs, setDocs] = useState<Record<string, CircleDoc>>({});
  const [ready, setReady] = useState(mode === "local");
  const [syncError, setSyncError] = useState<string | null>(null);
  const docsRef = useRef(docs);
  docsRef.current = docs;

  useEffect(() => {
    if (mode !== "cloud" || !db) return;
    const q = query(
      collection(db, "circles"),
      where("memberIds", "array-contains", userId)
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const next: Record<string, CircleDoc> = {};
        snap.forEach((d) => {
          next[d.id] = d.data() as CircleDoc;
        });
        setDocs(next);
        setReady(true);
        setSyncError(null);
      },
      (err) => {
        console.error("Firestore subscription failed:", err);
        setSyncError(
          "Could not load shared data. Check your connection (and Firestore rules) and reload."
        );
        setReady(true);
      }
    );
    return unsubscribe;
  }, [mode, userId]);

  const cloudState = useMemo(
    () => assembleState(userId, userName, docs),
    [userId, userName, docs]
  );
  const cloudStateRef = useRef(cloudState);
  cloudStateRef.current = cloudState;

  const writeDocs = useCallback(
    async (next: Record<string, CircleDoc>, prev: Record<string, CircleDoc>) => {
      if (!db) return;
      try {
        await Promise.all(
          Object.entries(next)
            .filter(([id, d]) => {
              const before = prev[id];
              if (!before) return true;
              // Ignore updatedAt when deciding whether anything changed.
              const a = { ...clean(d), updatedAt: 0 };
              const b = { ...clean(before), updatedAt: 0 };
              return stableStringify(a) !== stableStringify(b);
            })
            .map(([id, d]) => setDoc(doc(db!, "circles", id), clean(d)))
        );
      } catch (err) {
        console.error("Failed to save to Firestore:", err);
        setSyncError("Failed to save changes to the cloud. They may not be visible to others.");
      }
    },
    []
  );

  const setCloudState = useCallback<React.Dispatch<React.SetStateAction<State>>>(
    (action) => {
      const current = cloudStateRef.current;
      const nextState =
        typeof action === "function"
          ? (action as (s: State) => State)(current)
          : action;
      const prevDocs = docsRef.current;
      const nextDocs = splitState(nextState, prevDocs);
      // Optimistic local update; onSnapshot will reconcile.
      setDocs(nextDocs);
      void writeDocs(nextDocs, prevDocs);
    },
    [writeDocs]
  );

  const createCircle = useCallback(
    async (name: string) => {
      const circleName = name.trim();
      if (!circleName) throw new Error("Circle name is required.");
      if (mode === "local") {
        setLocalState((s) => {
          const circle = {
            id: uid(),
            name: circleName,
            inviteCode: makeInviteCode(),
            members: [s.user.id],
          };
          return {
            ...s,
            circles: [...s.circles, circle],
            user: { ...s.user, circles: [...s.user.circles, circle.id] },
          };
        });
        return;
      }
      const id = uid();
      const circleDoc: CircleDoc = {
        name: circleName,
        inviteCode: makeInviteCode(),
        memberIds: [userId],
        memberProfiles: { [userId]: { name: userName } },
        items: [],
        requests: [],
        loans: [],
        wishlist: [],
        messages: [],
        waitlist: [],
        consumables: [],
        consumableClaims: [],
        updatedAt: Date.now(),
      };
      await setDoc(doc(db!, "circles", id), clean(circleDoc));
    },
    [mode, userId, userName]
  );

  const joinCircle = useCallback(
    async (code: string) => {
      const normalized = normalizeInviteCode(code);
      if (!normalized) throw new Error("Enter an invite code.");
      if (mode === "local") {
        throw new Error(
          "Joining circles requires the cloud version (Firebase must be configured)."
        );
      }
      const snap = await getDocs(
        query(collection(db!, "circles"), where("inviteCode", "==", normalized))
      );
      if (snap.empty) {
        throw new Error(`No circle found with code “${normalized}”. Double-check and try again.`);
      }
      const target = snap.docs[0];
      const data = target.data() as CircleDoc;
      if (data.memberIds.includes(userId)) {
        throw new Error("You're already a member of this circle.");
      }
      await updateDoc(doc(db!, "circles", target.id), {
        memberIds: arrayUnion(userId),
        [`memberProfiles.${userId}`]: { name: userName },
        updatedAt: Date.now(),
      });
    },
    [mode, userId, userName]
  );

  const leaveCircle = useCallback(
    async (circleId: string) => {
      const current = mode === "cloud" ? cloudStateRef.current : localState;
      // In local mode `state.user.id` (from seed/load) is the real identity;
      // the module-level `userId` constant only applies to the cloud path.
      const me = current.user.id;
      const circle = current.circles.find((c) => c.id === circleId);
      if (!circle) throw new Error("Circle not found.");

      const circleItemIds = new Set(
        current.items.filter((i) => i.circleId === circleId).map((i) => i.id)
      );
      const hasBlockingLoan = current.loans.some(
        (l) =>
          l.status === "ACTIVE" &&
          circleItemIds.has(l.itemId) &&
          (l.borrowerId === me ||
            current.items.find((i) => i.id === l.itemId)?.ownerId === me)
      );
      if (hasBlockingLoan) {
        throw new Error(
          "You have an active loan in this circle (as owner or borrower). Return or complete it before leaving."
        );
      }

      const circleConsumableIds = new Set(
        current.consumables.filter((c) => c.circleId === circleId).map((c) => c.id)
      );

      if (mode === "local") {
        setLocalState((s) => ({
          ...s,
          circles: s.circles.filter((c) => c.id !== circleId),
          items: s.items.filter((i) => i.circleId !== circleId),
          requests: s.requests.filter(
            (r) => !circleItemIds.has(r.itemId)
          ),
          wishlist: s.wishlist.filter((w) => w.circleId !== circleId),
          waitlist: s.waitlist.filter((w) => !circleItemIds.has(w.itemId)),
          consumables: s.consumables.filter((c) => c.circleId !== circleId),
          consumableClaims: s.consumableClaims.filter(
            (c) => !circleConsumableIds.has(c.consumableId)
          ),
          user: { ...s.user, circles: s.user.circles.filter((id) => id !== circleId) },
        }));
        return;
      }

      // A departing member can't keep owning items/consumables in a circle
      // they're no longer part of, so those (and any requests/waitlist
      // entries on them) are pruned in the same write that removes them
      // from memberIds. Loans (and their message threads) are left
      // untouched so loan history survives departure.
      const circleDoc = docsRef.current[circleId];
      const remainingItems = (circleDoc?.items || []).filter(
        (i) => i.ownerId !== userId
      );
      const remainingItemIds = new Set(remainingItems.map((i) => i.id));
      const remainingRequests = (circleDoc?.requests || []).filter((r) =>
        remainingItemIds.has(r.itemId)
      );
      const remainingWaitlist = (circleDoc?.waitlist || []).filter((w) =>
        remainingItemIds.has(w.itemId)
      );
      const remainingConsumables = (circleDoc?.consumables || []).filter(
        (c) => c.ownerId !== userId
      );
      const remainingConsumableIds = new Set(remainingConsumables.map((c) => c.id));
      const remainingClaims = (circleDoc?.consumableClaims || []).filter((c) =>
        remainingConsumableIds.has(c.consumableId)
      );

      await updateDoc(doc(db!, "circles", circleId), {
        memberIds: arrayRemove(userId),
        items: remainingItems,
        requests: remainingRequests,
        waitlist: remainingWaitlist,
        consumables: remainingConsumables,
        consumableClaims: remainingClaims,
        updatedAt: Date.now(),
      });
    },
    [mode, userId, localState]
  );

  return {
    state: mode === "cloud" ? cloudState : localState,
    setState: mode === "cloud" ? setCloudState : setLocalState,
    ready: mode === "cloud" ? ready : true,
    mode,
    syncError,
    createCircle,
    joinCircle,
    leaveCircle,
  };
}
