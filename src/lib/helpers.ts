import type { State, User, Friend, Circle, Item, Loan } from "./types";

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
