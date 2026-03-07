import type { State, User, Friend, Circle, Item } from "./types";

export const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
export const now = () => Date.now();
export const DATE_FMT = (s: string) => new Date(s).toLocaleDateString();

const LS_KEY = "toolshare_state_final_v9";

export const load = (): State | null => {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "");
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
  return { user, friends, circles: [circle], items, requests: [], loans: [] };
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
    res.push(b64);
  }
  return res;
};
