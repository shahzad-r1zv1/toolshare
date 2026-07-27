/**
 * Deliberately coarse (not a precise address) — good enough for a rough
 * "~2 mi away" estimate without exposing exactly where someone lives.
 */
export type RoughLocation = { lat: number; lng: number };
export type User = { id: string; name: string; circles: string[]; location?: RoughLocation };
export type Friend = { id: string; name: string; location?: RoughLocation };
export type Circle = {
  id: string;
  name: string;
  inviteCode: string;
  members: string[];
};
export const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];
export const TIME_SLOTS = ["Morning", "Afternoon", "Evening"] as const;
export type TimeSlot = (typeof TIME_SLOTS)[number];

/**
 * Which days/time-of-day windows an item is generally available, e.g.
 * { Sat: ["Morning", "Afternoon"], Sun: ["Morning", "Afternoon"] } for
 * "weekend mornings and afternoons". An empty/missing entry for a day means
 * not available that day. Undefined (not just empty) means the owner hasn't
 * set structured availability at all.
 */
export type Availability = Partial<Record<DayOfWeek, TimeSlot[]>>;

export type Item = {
  id: string;
  ownerId: string;
  circleId: string;
  title: string;
  category?: string;
  photos: string[];
  note?: string;
  rv?: number;
  /** Legacy free-text availability, kept for items saved before structured availability shipped. */
  avail?: string;
  availability?: Availability;
  createdAt: number;
  /** Archived items are hidden from browsing/requesting but keep their loan history. */
  archived?: boolean;
  /**
   * Optional rental rate. Tracking only — no payment moves through the app;
   * the owner and borrower settle up outside it and the owner marks it paid.
   */
  rate?: { amount: number; unit: "day" | "flat" };
};
export type Request = {
  id: string;
  itemId: string;
  borrowerId: string;
  startDate: string;
  endDate: string;
  status: "PENDING" | "APPROVED" | "DECLINED";
  createdAt: number;
  /**
   * Set when this request asks to extend an existing active loan rather
   * than start a new one. `endDate` holds the requested new due date.
   */
  renewLoanId?: string;
};
export type Loan = {
  id: string;
  itemId: string;
  /** Snapshot of the item at loan creation, so history survives item deletion. */
  itemTitle: string;
  itemCategory?: string;
  borrowerId: string;
  startDate: string;
  endDate: string;
  status: "ACTIVE" | "RETURNED";
  returnPhotos: string[];
  returnNotes?: string;
  /** Set when markReturned runs; used to judge on-time vs. late for trust scoring. */
  returnedAt?: number;
  /** Set when a renewal has been requested for this loan (see Request). */
  renewalRequestId?: string;
  /**
   * Two-sided handoff: the owner marks a loan RETURNED, but the borrower
   * separately confirms it. Both default to unset until each party acts.
   */
  ownerConfirmedReturn?: boolean;
  borrowerConfirmedReturn?: boolean;
  /** Set when either party flags a problem with the returned item. */
  dispute?: {
    raisedBy: string;
    reason: string;
    photos: string[];
    createdAt: number;
    resolved?: boolean;
  };
  /** Snapshot of the item's rate at approval time, plus the computed cost for this loan's dates. */
  rate?: { amount: number; unit: "day" | "flat" };
  cost?: number;
  /** Owner-tracked "settled up outside the app" flag; no real payment moves through it. */
  paid?: boolean;
};

export type Message = {
  id: string;
  /** Groups messages into a thread: a request id or a loan id. */
  threadId: string;
  senderId: string;
  text: string;
  createdAt: number;
};

export type WaitlistEntry = {
  id: string;
  itemId: string;
  requesterId: string;
  createdAt: number;
};
export type WishlistEntry = {
  id: string;
  circleId: string;
  requesterId: string;
  title: string;
  note?: string;
  createdAt: number;
};

/**
 * A consumable is used up rather than borrowed and returned — leftover
 * paint, scrap wood, extra screws. `quantity` decreases as people claim it;
 * once it hits 0 the listing is effectively gone (kept for history, hidden
 * from browsing).
 */
export type Consumable = {
  id: string;
  ownerId: string;
  circleId: string;
  title: string;
  category?: string;
  photos: string[];
  note?: string;
  /** Free-text so it fits anything: "2 gallons", "5 boards", "half a box". */
  quantity: string;
  createdAt: number;
};

export type ConsumableClaim = {
  id: string;
  consumableId: string;
  claimerId: string;
  /** Free-text amount claimed, e.g. "1 gallon" — matches quantity's free-text unit. */
  amount: string;
  createdAt: number;
};

export type State = {
  user: User;
  friends: Friend[];
  circles: Circle[];
  items: Item[];
  requests: Request[];
  loans: Loan[];
  wishlist: WishlistEntry[];
  messages: Message[];
  waitlist: WaitlistEntry[];
  consumables: Consumable[];
  consumableClaims: ConsumableClaim[];
};
