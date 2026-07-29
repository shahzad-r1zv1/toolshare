import type {
  State,
  User,
  Friend,
  Circle,
  Item,
  Loan,
  RoughLocation,
  Availability,
  DayOfWeek,
  Message,
} from "./types";
import { DAYS_OF_WEEK } from "./types";

export const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
export const now = () => Date.now();
export const DATE_FMT = (s: string) => new Date(s).toLocaleDateString();

const LS_KEY = "toolshare_state_final_v10";

export const load = (): State | null => {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(LS_KEY) || "");
    if (!parsed || typeof parsed !== "object") return null;
    // Backfill fields added after this record was first saved.
    if (!Array.isArray(parsed.wishlist)) parsed.wishlist = [];
    if (!Array.isArray(parsed.messages)) parsed.messages = [];
    if (!Array.isArray(parsed.waitlist)) parsed.waitlist = [];
    if (!Array.isArray(parsed.consumables)) parsed.consumables = [];
    if (!Array.isArray(parsed.consumableClaims)) parsed.consumableClaims = [];
    if (Array.isArray(parsed.loans)) {
      const itemById = new Map(
        (parsed.items || []).map((i: Item) => [i.id, i])
      );
      for (const loan of parsed.loans as Loan[]) {
        if (loan.itemTitle == null) {
          const item = itemById.get(loan.itemId) as Item | undefined;
          loan.itemTitle = item?.title || "Deleted item";
          loan.itemCategory = item?.category;
        }
      }
    }
    return parsed as State;
  } catch {
    return null;
  }
};

export const save = (s: State) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(s));
};

export const seed = (): State => {
  const user: User = { id: "you", name: "You", circles: [] };
  const friends: Friend[] = [
    { id: "alice", name: "Alice" },
    { id: "bob", name: "Bob" },
  ];
  const circle: Circle = {
    id: uid(),
    name: "Family",
    inviteCode: "FAM-" + uid().slice(0, 5).toUpperCase(),
    members: [user.id, friends[0].id, friends[1].id],
  };
  user.circles = [circle.id];
  const items: Item[] = [
    {
      id: uid(),
      ownerId: user.id,
      circleId: circle.id,
      title: "Spray Painter",
      category: "Painting",
      photos: [],
      note: "Flush nozzle after use.",
      rv: 180,
      avail: "Weekends",
      createdAt: now(),
    },
    {
      id: uid(),
      ownerId: friends[0].id,
      circleId: circle.id,
      title: "18V Drill + Bits",
      category: "Power Tools",
      photos: [],
      note: "Battery ~40 min.",
      rv: 120,
      avail: "Evenings",
      createdAt: now(),
    },
  ];
  return {
    user,
    friends,
    circles: [circle],
    items,
    requests: [],
    loans: [],
    wishlist: [],
    messages: [],
    waitlist: [],
    consumables: [],
    consumableClaims: [],
  };
};

// Photos are stored inline (base64) in shared circle documents, so they must
// stay small — Firestore caps a document at 1 MB.
const MAX_PHOTO_DIM = 900;
const PHOTO_QUALITY = 0.7;

const downscaleImage = (dataUrl: string): Promise<string> =>
  new Promise((resolve) => {
    if (typeof document === "undefined" || typeof Image === "undefined") {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, MAX_PHOTO_DIM / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL("image/jpeg", PHOTO_QUALITY);
        // Re-encoding can occasionally produce a larger result; keep the smaller.
        resolve(compressed.length < dataUrl.length ? compressed : dataUrl);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });

export const datesOverlap = (
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean => aStart <= bEnd && bStart <= aEnd;

/** The active loan (if any) on this item that overlaps the given date range. */
export const findOverlappingLoan = (
  loans: Loan[],
  itemId: string,
  start: string,
  end: string
): Loan | undefined =>
  loans.find(
    (l) =>
      l.itemId === itemId &&
      l.status === "ACTIVE" &&
      datesOverlap(l.startDate, l.endDate, start, end)
  );

export type DueStatus = "overdue" | "due-today" | "due-soon" | "ok";

/** Days between two YYYY-MM-DD dates (b - a), ignoring time of day. */
const daysBetween = (a: Date, b: Date): number =>
  Math.round((b.getTime() - a.getTime()) / 86400000);

/**
 * Classify a loan's due date relative to today (D-1/D/D+1 reminder window
 * from the PRD): "overdue" once past the due date, "due-today" on the due
 * date, "due-soon" the day before, otherwise "ok".
 */
export const dueStatus = (endDate: string, today: Date = new Date()): DueStatus => {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  // Parse the YYYY-MM-DD parts directly rather than via `new Date(endDate)`,
  // which treats the string as UTC midnight and can shift the due date back
  // a full calendar day once read through local getFullYear/getMonth/getDate.
  const [dueYear, dueMonth, dueDate] = endDate.split("-").map(Number);
  const dueDay = new Date(dueYear, dueMonth - 1, dueDate);
  const diff = daysBetween(start, dueDay);
  if (diff < 0) return "overdue";
  if (diff === 0) return "due-today";
  if (diff === 1) return "due-soon";
  return "ok";
};

/**
 * The active (not-yet-returned) loan on this item, regardless of the
 * requested date range. Unlike findOverlappingLoan (a date-range check), this
 * blocks ANY new request while a prior loan is outstanding — closing the gap
 * where a never-returned item could still be re-booked for future dates.
 */
export const findOutstandingLoan = (loans: Loan[], itemId: string): Loan | undefined =>
  loans.find((l) => l.itemId === itemId && l.status === "ACTIVE");

/** True if a loan was returned after its due date (needs returnedAt to be set). */
export const wasReturnedLate = (loan: Loan): boolean => {
  if (loan.status !== "RETURNED" || !loan.returnedAt) return false;
  const [y, m, d] = loan.endDate.split("-").map(Number);
  const dueEndOfDay = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
  return loan.returnedAt > dueEndOfDay;
};

/**
 * Share of a member's completed loans (as borrower) returned on or before
 * their due date. Returns null when the member has no returned-loan history
 * yet (too new to score). Loans returned before `returnedAt` was introduced
 * count as on-time, since we have no record of their actual return time.
 */
export const trustScore = (
  loans: Loan[],
  memberId: string
): { onTimeRate: number; completedCount: number } | null => {
  const completed = loans.filter(
    (l) => l.borrowerId === memberId && l.status === "RETURNED"
  );
  if (completed.length === 0) return null;
  const onTime = completed.filter((l) => !wasReturnedLate(l)).length;
  return {
    onTimeRate: Math.round((onTime / completed.length) * 100),
    completedCount: completed.length,
  };
};

const EARTH_RADIUS_MI = 3958.8;

/** Great-circle distance between two rough locations, in miles. */
export const distanceMiles = (a: RoughLocation, b: RoughLocation): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_MI * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
};

/** "~2 mi away" style label, or undefined if either location is missing. */
export const distanceLabel = (
  from: RoughLocation | undefined,
  to: RoughLocation | undefined
): string | undefined => {
  if (!from || !to) return undefined;
  const miles = distanceMiles(from, to);
  if (miles < 0.1) return "nearby";
  return `~${miles < 10 ? miles.toFixed(1) : Math.round(miles)} mi away`;
};

/**
 * Coarsen a precise coordinate to roughly a few hundred meters of
 * resolution, so a member's location reads as "nearby" rather than
 * pinpointing their address.
 */
export const coarsenLocation = (loc: RoughLocation): RoughLocation => ({
  lat: Math.round(loc.lat * 100) / 100,
  lng: Math.round(loc.lng * 100) / 100,
});

/** Cost for a loan window at the item's rate: amount as-is for "flat", or amount × nights for "day". */
export const rentalCost = (
  rate: { amount: number; unit: "day" | "flat" },
  startDate: string,
  endDate: string
): number => {
  if (rate.unit === "flat") return rate.amount;
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const [ey, em, ed] = endDate.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  const nights = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  return rate.amount * nights;
};

const DAY_INDEX: Record<DayOfWeek, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** True if `availability` has at least one day with at least one slot checked. */
export const hasAvailability = (availability: Availability | undefined): boolean =>
  Boolean(availability && Object.values(availability).some((slots) => slots && slots.length > 0));

/** Compact display string, e.g. "Sat/Sun: Morning, Afternoon" or "Mon-Fri: Evening". */
export const formatAvailability = (availability: Availability | undefined): string => {
  if (!hasAvailability(availability)) return "";
  const groups = new Map<string, DayOfWeek[]>();
  for (const day of DAYS_OF_WEEK) {
    const slots = availability![day];
    if (!slots || slots.length === 0) continue;
    const key = slots.join(", ");
    groups.set(key, [...(groups.get(key) || []), day]);
  }
  return [...groups.entries()].map(([slots, days]) => `${days.join("/")}: ${slots}`).join(" · ");
};

/**
 * True if a date range includes at least one day the owner has NOT marked
 * available (or the range spans more distinct weekdays than are ever
 * available). Used only for a soft heads-up on requests — never blocks.
 * Returns false when the owner hasn't set structured availability at all,
 * since there's nothing to warn against.
 */
export const isOutsideAvailability = (
  availability: Availability | undefined,
  startDate: string,
  endDate: string
): boolean => {
  if (!hasAvailability(availability)) return false;
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const [ey, em, ed] = endDate.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  if (end < start) return false;

  const availableDays = new Set(
    DAYS_OF_WEEK.filter((d) => (availability![d]?.length ?? 0) > 0).map((d) => DAY_INDEX[d])
  );

  const cursor = new Date(start);
  let days = 0;
  const MAX_DAYS_CHECKED = 30; // a week's pattern repeats; no need to walk months of a long loan
  while (cursor <= end && days < MAX_DAYS_CHECKED) {
    if (!availableDays.has(cursor.getDay())) return true;
    cursor.setDate(cursor.getDate() + 1);
    days++;
  }
  return false;
};

/** True if `userId` has not yet opened the thread this message belongs to (and didn't send it themselves). */
export const isMessageUnread = (message: Message, userId: string): boolean =>
  message.senderId !== userId && !(message.readBy || []).includes(userId);

/** How many messages in this thread `userId` hasn't seen yet. */
export const unreadMessageCount = (
  messages: Message[],
  threadId: string,
  userId: string
): number =>
  messages.filter((m) => m.threadId === threadId && isMessageUnread(m, userId)).length;

/**
 * Total unread messages across every thread `userId` is a party to — a
 * request or loan where they're the borrower, or an item they own. Used to
 * surface a badge outside the individual thread (e.g. on a tab), since
 * unread counts on the Message button alone are invisible until that
 * specific card is scrolled into view.
 */
export const totalUnreadMessages = (state: State, userId: string): number => {
  const myItemIds = new Set(state.items.filter((i) => i.ownerId === userId).map((i) => i.id));
  const myThreadIds = new Set<string>();
  for (const r of state.requests) {
    if (r.borrowerId === userId || myItemIds.has(r.itemId)) myThreadIds.add(r.id);
  }
  for (const l of state.loans) {
    if (l.borrowerId === userId || myItemIds.has(l.itemId)) myThreadIds.add(l.id);
  }
  return state.messages.filter(
    (m) => myThreadIds.has(m.threadId) && isMessageUnread(m, userId)
  ).length;
};

export const filesTo64 = async (arr: File[]): Promise<string[]> => {
  const res: string[] = [];
  for (const f of arr) {
    const b64 = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(f);
    });
    res.push(await downscaleImage(b64));
  }
  return res;
};
