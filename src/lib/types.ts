export type User = { id: string; name: string; circles: string[] };
export type Friend = { id: string; name: string };
export type Circle = {
  id: string;
  name: string;
  inviteCode: string;
  members: string[];
};
export type Item = {
  id: string;
  ownerId: string;
  circleId: string;
  title: string;
  category?: string;
  photos: string[];
  note?: string;
  rv?: number;
  avail?: string;
  createdAt: number;
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
  /** Set when a renewal has been requested for this loan (see Request). */
  renewalRequestId?: string;
};
export type WishlistEntry = {
  id: string;
  circleId: string;
  requesterId: string;
  title: string;
  note?: string;
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
};
