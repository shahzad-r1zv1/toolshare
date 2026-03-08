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
};
export type Loan = {
  id: string;
  itemId: string;
  borrowerId: string;
  startDate: string;
  endDate: string;
  status: "ACTIVE" | "RETURNED";
  returnPhotos: string[];
  returnNotes?: string;
};
export type State = {
  user: User;
  friends: Friend[];
  circles: Circle[];
  items: Item[];
  requests: Request[];
  loans: Loan[];
};
