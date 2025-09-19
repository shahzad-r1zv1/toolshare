/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useEffect, useMemo, useState } from "react";

// ----------------------------------
// Helpers & Persistence
// ----------------------------------
const uid = () => Math.random().toString(36).slice(2);
const now = () => Date.now();
const LS_KEY = "toolshare_state_final_v9";
const DATE_FMT = (s: string) => new Date(s).toLocaleDateString();

// ----------------------------------
// Types
// ----------------------------------
export type User = { id: string; name: string; circles: string[] };
export type Friend = { id: string; name: string };
export type Circle = { id: string; name: string; inviteCode: string; members: string[] };
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
  startDate: string; // yyyy-mm-dd
  endDate: string; // yyyy-mm-dd
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
export type State = { user: User; friends: Friend[]; circles: Circle[]; items: Item[]; requests: Request[]; loans: Loan[] };

// ----------------------------------
// Seed
// ----------------------------------
const seed = (): State => {
  const user: User = { id: "you", name: "You", circles: [] };
  const friends: Friend[] = [{ id: "alice", name: "Alice" }, { id: "bob", name: "Bob" }];
  const circle: Circle = {
    id: uid(),
    name: "Family",
    inviteCode: "FAM-" + uid().slice(0, 5).toUpperCase(),
    members: [user.id, friends[0].id, friends[1].id],
  };
  user.circles = [circle.id];
  const items: Item[] = [
    { id: uid(), ownerId: user.id, circleId: circle.id, title: "Spray Painter", category: "Painting", photos: [], note: "Flush nozzle after use.", rv: 180, avail: "Weekends", createdAt: now() },
    { id: uid(), ownerId: friends[0].id, circleId: circle.id, title: "18V Drill + Bits", category: "Power Tools", photos: [], note: "Battery ~40 min.", rv: 120, avail: "Evenings", createdAt: now() },
  ];
  return { user, friends, circles: [circle], items, requests: [], loans: [] };
};

const load = (): State | null => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || ""); } catch { return null; }
};
const save = (s: State) => localStorage.setItem(LS_KEY, JSON.stringify(s));

// ----------------------------------
// UI Primitives
// ----------------------------------
function Button({ onClick, children, kind = "primary", type = "button" }: { onClick?: () => void; children: React.ReactNode; kind?: "primary" | "secondary" | "ghost" | "danger"; type?: "button" | "submit" }) {
  const base = "px-3 py-2 rounded-2xl text-sm font-medium transition-colors";
  const map: Record<string, string> = {
    primary: "bg-emerald-600 hover:bg-emerald-500 text-white",
    secondary: "bg-gray-800 hover:bg-gray-700 text-gray-100",
    ghost: "bg-transparent hover:bg-gray-800 text-gray-100",
    danger: "bg-red-600 hover:bg-red-500 text-white",
  };
  return <button type={type} onClick={onClick} className={`${base} ${map[kind]}`}>{children}</button>;
}
function Card({ children }: { children: React.ReactNode }) { return <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-sm">{children}</div>; }
function Avatar({ name }: { name: string }) {
  return (
    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-700 text-white text-xs font-bold">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" role="dialog" aria-modal>
      <div className="bg-gray-950 border border-gray-800 rounded-2xl p-4 max-w-lg w-full">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold">{title}</h4>
          <Button kind="ghost" onClick={onClose}>Close</Button>
        </div>
        <div className="grid gap-3">{children}</div>
      </div>
    </div>
  );
}
const filesTo64 = async (arr: File[]): Promise<string[]> => {
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

// ----------------------------------
// MyCircle (group by member + thumbnails + search/filter)
// ----------------------------------
function MyCircle({ state, activeCircleId, search, filter, onOpenDetails }: { state: State; activeCircleId: string; search: string; filter: string; onOpenDetails: (item: Item) => void }) {
  const members = useMemo(() => {
    const ids = state.circles.find(c => c.id === activeCircleId)?.members || [];
    return [state.user, ...state.friends].filter(m => ids.includes(m.id));
  }, [state, activeCircleId]);

  const itemsByMember = (memberId: string) =>
    state.items.filter(i => i.circleId === activeCircleId && i.ownerId === memberId)
      .filter(i => i.title.toLowerCase().includes(search.toLowerCase()))
      .filter(i => !filter || i.category === filter);

  return (
    <div className="space-y-6">
      {members.map(m => {
        const owned = itemsByMember(m.id);
        return (
          <div key={m.id}>
            <div className="flex items-center gap-2 mb-2"><Avatar name={m.name} /><h2 className="font-semibold">{m.name}</h2></div>
            {owned.length === 0 && <p className="text-sm text-gray-500 italic">No matching tools for {m.name}</p>}
            <div className="grid gap-3 md:grid-cols-2">
              {owned.map(item => (
                <Card key={item.id}>
                  <div className="flex gap-3 items-center">
                    {item.photos[0] ? (
                      <img src={item.photos[0]} alt={item.title} className="w-16 h-16 object-cover rounded-md border border-gray-700" />
                    ) : (
                      <div className="w-16 h-16 flex items-center justify-center bg-gray-800 text-xs text-gray-400 rounded-md">No Photo</div>
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{item.title}</div>
                      {item.category && <div className="text-xs text-gray-400">{item.category}</div>}
                    </div>
                    <Button kind="ghost" onClick={() => onOpenDetails(item)}>Details</Button>
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

// ----------------------------------
// MyItems (add/edit/delete + category + photos)
// ----------------------------------
function MyItems({ state, setState, activeCircleId }: { state: State; setState: React.Dispatch<React.SetStateAction<State>>; activeCircleId: string }) {
  const myItems = state.items.filter(i => i.ownerId === state.user.id && i.circleId === activeCircleId);
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState<Item | null>(null);
  const [title, setTitle] = useState(""); const [note, setNote] = useState(""); const [rv, setRv] = useState(""); const [avail, setAvail] = useState(""); const [category, setCategory] = useState(""); const [files, setFiles] = useState<File[]>([]);

  const openNew = () => { setEditing(null); setTitle(""); setNote(""); setRv(""); setAvail(""); setCategory(""); setFiles([]); setOpen(true); };
  const openEdit = (item: Item) => { setEditing(item); setTitle(item.title); setNote(item.note || ""); setRv(item.rv ? String(item.rv) : ""); setAvail(item.avail || ""); setCategory(item.category || ""); setFiles([]); setOpen(true); };

  const saveItem = async () => {
    if (!title.trim()) return alert("Need title");
    let photos: string[] = editing ? editing.photos : [];
    if (files.length > 0) photos = await filesTo64(files.slice(0, 3));
    if (editing) {
      const updated: Item = { ...editing, title, note, rv: rv ? Number(rv) : undefined, avail, category: category || undefined, photos };
      setState(s => ({ ...s, items: s.items.map(i => i.id === editing.id ? updated : i) }));
    } else {
      const newItem: Item = { id: uid(), ownerId: state.user.id, circleId: activeCircleId, title, note, rv: rv ? Number(rv) : undefined, avail, category: category || undefined, photos, createdAt: now() };
      setState(s => ({ ...s, items: [newItem, ...s.items] }));
    }
    setOpen(false);
  };

  const deleteItem = () => {
    if (editing) {
      // Clean up dependent requests/loans referencing this item (simple: remove requests; keep loans)
      setState(s => ({
        ...s,
        items: s.items.filter(i => i.id !== editing.id),
        requests: s.requests.filter(r => r.itemId !== editing.id),
      }));
      setOpen(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Your Items</h3>
        <Button onClick={openNew}>Add Item</Button>
      </div>
      {myItems.length === 0 && <p className="text-sm text-gray-500 italic">No items yet — add your first tool!</p>}
      {myItems.map(item => (
        <Card key={item.id}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              {item.photos[0] ? (
                <img src={item.photos[0]} alt={item.title} className="w-12 h-12 object-cover rounded-md border border-gray-700" />
              ) : (
                <div className="w-12 h-12 flex items-center justify-center bg-gray-800 text-[10px] text-gray-400 rounded-md">No Photo</div>
              )}
              <div>
                <div className="font-medium">{item.title}</div>
                {item.category && <div className="text-xs text-gray-400">{item.category}</div>}
                {item.rv && <div className="text-xs text-gray-400">RV: ${item.rv}</div>}
              </div>
            </div>
            <Button kind="secondary" onClick={() => openEdit(item)}>Edit</Button>
          </div>
        </Card>
      ))}

      {open && (
        <Modal title={editing ? "Edit Item" : "Add Item"} onClose={() => setOpen(false)}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="px-3 py-2 bg-gray-900 border border-gray-700 rounded" />
          <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Category (e.g., Power Tools)" className="px-3 py-2 bg-gray-900 border border-gray-700 rounded" />
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Notes (condition, accessories)" className="px-3 py-2 bg-gray-900 border border-gray-700 rounded" />
          <input type="number" value={rv} onChange={e => setRv(e.target.value)} placeholder="Replacement Value" className="px-3 py-2 bg-gray-900 border border-gray-700 rounded" />
          <input value={avail} onChange={e => setAvail(e.target.value)} placeholder="Availability (e.g., Weekends)" className="px-3 py-2 bg-gray-900 border border-gray-700 rounded" />
          <input multiple type="file" accept="image/*" onChange={e => setFiles(Array.from(e.target.files || []))} />
          <div className="flex gap-2">
            <Button onClick={saveItem}>{editing ? "Update" : "Save"}</Button>
            {editing && <Button kind="danger" onClick={deleteItem}>Delete</Button>}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ----------------------------------
// Requests (meaningful + approve/decline + active + mark returned)
// ----------------------------------
function Requests({ state, setState, search, filter }: { state: State; setState: React.Dispatch<React.SetStateAction<State>>; search: string; filter: string }) {
  const you = state.user.id;
  const myItemIds = new Set(state.items.filter(i => i.ownerId === you).map(i => i.id));
  const findItem = (id: string) => state.items.find(i => i.id === id);
  const findUser = (id: string) => [state.user, ...state.friends].find(u => u.id === id);

  const incoming = state.requests.filter(r => myItemIds.has(r.itemId) && r.status === "PENDING")
    .filter(r => {
      const it = findItem(r.itemId); if (!it) return false;
      return it.title.toLowerCase().includes(search.toLowerCase()) && (!filter || it.category === filter);
    });
  const outgoing = state.requests.filter(r => r.borrowerId === you && r.status === "PENDING")
    .filter(r => {
      const it = findItem(r.itemId); if (!it) return false;
      return it.title.toLowerCase().includes(search.toLowerCase()) && (!filter || it.category === filter);
    });
  const active = state.loans.filter(l => l.status === "ACTIVE")
    .filter(l => {
      const it = findItem(l.itemId); if (!it) return false;
      return it.title.toLowerCase().includes(search.toLowerCase()) && (!filter || it.category === filter);
    });

  const approve = (r: Request) => {
    const loan: Loan = { id: uid(), itemId: r.itemId, borrowerId: r.borrowerId, startDate: r.startDate, endDate: r.endDate, status: "ACTIVE", returnPhotos: [] };
    setState(s => ({ ...s, requests: s.requests.map(x => x.id === r.id ? { ...x, status: "APPROVED" } : x), loans: [loan, ...s.loans] }));
  };
  const decline = (r: Request) => setState(s => ({ ...s, requests: s.requests.map(x => x.id === r.id ? { ...x, status: "DECLINED" } : x) }));

  const [returning, setReturning] = useState<Loan | null>(null);
  const [returnNotes, setReturnNotes] = useState("");
  const [returnFiles, setReturnFiles] = useState<File[]>([]);
  const markReturned = async () => {
    if (!returning) return;
    const photos = await filesTo64(returnFiles.slice(0, 3));
    setState(s => ({
      ...s,
      loans: s.loans.map(x => x.id === returning.id ? { ...x, status: "RETURNED", returnNotes, returnPhotos: photos } : x),
    }));
    setReturning(null); setReturnNotes(""); setReturnFiles([]);
  };

  return (
    <div className="space-y-6">
      <section>
        <h3 className="font-semibold mb-2">Incoming Requests</h3>
        {incoming.length === 0 && <p className="text-sm text-gray-500 italic">No pending incoming requests.</p>}
        {incoming.map(r => {
          const item = findItem(r.itemId); const borrower = findUser(r.borrowerId);
          return (
            <Card key={r.id}>
              <div className="flex items-center gap-3">
                {item?.photos[0] ? (<img src={item.photos[0]} alt={item.title} className="w-12 h-12 object-cover rounded-md border border-gray-700" />) : (<div className="w-12 h-12 flex items-center justify-center bg-gray-800 text-[10px] text-gray-400 rounded-md">No Photo</div>)}
                <div className="flex-1">
                  <div><b>{borrower?.name}</b> wants <b>{item?.title}</b></div>
                  <div className="text-xs text-gray-400">{DATE_FMT(r.startDate)} → {DATE_FMT(r.endDate)}</div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => approve(r)}>Approve</Button>
                  <Button kind="secondary" onClick={() => decline(r)}>Decline</Button>
                </div>
              </div>
            </Card>
          );
        })}
      </section>

      <section>
        <h3 className="font-semibold mb-2">Outgoing Requests</h3>
        {outgoing.length === 0 && <p className="text-sm text-gray-500 italic">No outgoing pending requests.</p>}
        {outgoing.map(r => {
          const item = findItem(r.itemId); const owner = findUser(item?.ownerId || "");
          return (
            <Card key={r.id}>
              <div className="flex items-center gap-3">
                {item?.photos[0] ? (<img src={item.photos[0]} alt={item.title} className="w-12 h-12 object-cover rounded-md border border-gray-700" />) : (<div className="w-12 h-12 flex items-center justify-center bg-gray-800 text-[10px] text-gray-400 rounded-md">No Photo</div>)}
                <div className="flex-1">
                  <div>Waiting on <b>{owner?.name}</b> to approve <b>{item?.title}</b></div>
                  <div className="text-xs text-gray-400">{DATE_FMT(r.startDate)} → {DATE_FMT(r.endDate)}</div>
                </div>
              </div>
            </Card>
          );
        })}
      </section>

      <section>
        <h3 className="font-semibold mb-2">Active Loans</h3>
        {active.length === 0 && <p className="text-sm text-gray-500 italic">No active loans right now.</p>}
        {active.map(l => {
          const item = findItem(l.itemId); const borrower = findUser(l.borrowerId);
          const iOwnThisItem = item?.ownerId === you;
          const overdue = new Date(l.endDate) < new Date();
          return (
            <Card key={l.id}>
              <div className="flex items-center gap-3">
                {item?.photos[0] ? (<img src={item.photos[0]} alt={item.title} className="w-12 h-12 object-cover rounded-md border border-gray-700" />) : (<div className="w-12 h-12 flex items-center justify-center bg-gray-800 text-[10px] text-gray-400 rounded-md">No Photo</div>)}
                <div className="flex-1">
                  <div><b>{item?.title}</b> borrowed by <b>{borrower?.name}</b></div>
                  <div className={`text-xs ${overdue ? "text-red-400" : "text-gray-400"}`}>Due {DATE_FMT(l.endDate)}{overdue ? " • Overdue" : ""}</div>
                </div>
                {iOwnThisItem && <Button onClick={() => setReturning(l)}>Mark Returned</Button>}
              </div>
            </Card>
          );
        })}
      </section>

      {returning && (
        <Modal title="Complete Return" onClose={() => setReturning(null)}>
          <textarea value={returnNotes} onChange={e => setReturnNotes(e.target.value)} placeholder="Return notes (condition, issues)" className="px-3 py-2 bg-gray-900 border border-gray-700 rounded" />
          <input multiple type="file" accept="image/*" onChange={e => setReturnFiles(Array.from(e.target.files || []))} />
          <div className="flex gap-2">
            <Button onClick={markReturned}>Confirm Return</Button>
            <Button kind="secondary" onClick={() => setReturning(null)}>Cancel</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ----------------------------------
// Loan History (returned loans)
// ----------------------------------
function LoanHistory({ state, search, filter }: { state: State; search: string; filter: string }) {
  const findItem = (id: string) => state.items.find(i => i.id === id);
  const findUser = (id: string) => [state.user, ...state.friends].find(u => u.id === id);
  const history = state.loans.filter(l => l.status === "RETURNED").filter(l => {
    const it = findItem(l.itemId); if (!it) return false;
    return it.title.toLowerCase().includes(search.toLowerCase()) && (!filter || it.category === filter);
  });

  return (
    <div className="space-y-3">
      {history.length === 0 && <p className="text-sm text-gray-500 italic">No past loans yet.</p>}
      {history.map(l => {
        const item = findItem(l.itemId); const borrower = findUser(l.borrowerId);
        return (
          <Card key={l.id}>
            <div className="flex items-center gap-3">
              {item?.photos[0] ? (
                <img src={item.photos[0]} alt={item.title} className="w-12 h-12 object-cover rounded-md border border-gray-700" />
              ) : (
                <div className="w-12 h-12 flex items-center justify-center bg-gray-800 text-[10px] text-gray-400 rounded-md">No Photo</div>
              )}
              <div>
                <div><b>{item?.title}</b> was borrowed by <b>{borrower?.name}</b></div>
                <div className="text-xs text-gray-400">{DATE_FMT(l.startDate)} → {DATE_FMT(l.endDate)}</div>
                {l.returnNotes && <div className="text-xs text-gray-300">Notes: {l.returnNotes}</div>}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ----------------------------------
// Details Modal (shared)
// ----------------------------------
function DetailsModal({ item, onClose, onRequest }: { item: Item; onClose: () => void; onRequest: (start: string, end: string) => void }) {
  const [start, setStart] = useState(""); const [end, setEnd] = useState("");
  return (
    <Modal title={item.title} onClose={onClose}>
      {item.photos[0] && <img src={item.photos[0]} alt={item.title} className="rounded-xl max-h-48 object-cover mb-2" />}
      {item.category && <p className="text-sm text-gray-300">Category: {item.category}</p>}
      {item.note && <p className="text-sm text-gray-300">Note: {item.note}</p>}
      {item.rv && <p className="text-sm text-gray-300">Replacement Value: ${item.rv}</p>}
      {item.avail && <p className="text-sm text-gray-300">Availability: {item.avail}</p>}
      <div className="grid grid-cols-2 gap-2">
        <input type="date" value={start} onChange={e => setStart(e.target.value)} className="px-2 py-2 bg-gray-900 border border-gray-700 rounded" />
        <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="px-2 py-2 bg-gray-900 border border-gray-700 rounded" />
      </div>
      <Button onClick={() => onRequest(start, end)}>Request Tool</Button>
    </Modal>
  );
}

// ----------------------------------
// Main Page
// ----------------------------------
export default function Page() {
  const [state, setState] = useState<State>(() => load() || seed());
  useEffect(() => save(state), [state]);

  const [tab, setTab] = useState<"circle" | "items" | "reqs" | "history">("circle");
  const [activeCircleId, setActiveCircleId] = useState(state.user.circles[0] || state.circles[0]?.id || "");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [detailsFor, setDetailsFor] = useState<Item | null>(null);

  const activeCircle = state.circles.find(c => c.id === activeCircleId);
  const categories = Array.from(new Set(state.items.filter(i => i.circleId === activeCircleId).map(i => i.category).filter(Boolean))) as string[];

  const onOpenDetails = (item: Item) => setDetailsFor(item);
  const onCloseDetails = () => setDetailsFor(null);
  const handleRequest = (start: string, end: string) => {
    if (!detailsFor) return;
    if (!start || !end) { alert("Pick dates"); return; }
    if (state.user.id === detailsFor.ownerId) { alert("You cannot request your own item."); return; }
    const req: Request = { id: uid(), itemId: detailsFor.id, borrowerId: state.user.id, startDate: start, endDate: end, status: "PENDING", createdAt: now() };
    setState(s => ({ ...s, requests: [req, ...s.requests] }));
    setDetailsFor(null);
  };

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <header className="p-4 border-b border-gray-800 bg-gray-900 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">ToolShare</h1>
            <select className="bg-gray-800 text-sm rounded-lg px-2 py-1" value={activeCircleId} onChange={e => setActiveCircleId(e.target.value)}>
              {state.circles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {activeCircle && (
            <div className="text-xs text-gray-400">Invite Code: <span className="font-mono">{activeCircle.inviteCode}</span></div>
          )}
        </div>
      </header>

      <main className="p-4 max-w-5xl mx-auto">
        <div className="flex gap-2 mb-4">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tools..." className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm flex-1" />
          <select value={filter} onChange={e => setFilter(e.target.value)} className="px-2 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm">
            <option value="">All</option>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex gap-2 mb-4">
          <Button kind={tab === "circle" ? "primary" : "secondary"} onClick={() => setTab("circle")}>My Circle</Button>
          <Button kind={tab === "items" ? "primary" : "secondary"} onClick={() => setTab("items")}>My Items</Button>
          <Button kind={tab === "reqs" ? "primary" : "secondary"} onClick={() => setTab("reqs")}>Requests</Button>
          <Button kind={tab === "history" ? "primary" : "secondary"} onClick={() => setTab("history")}>History</Button>
        </div>

        {tab === "circle" && (
          <MyCircle state={state} activeCircleId={activeCircleId} search={search} filter={filter} onOpenDetails={onOpenDetails} />
        )}
        {tab === "items" && (
          <MyItems state={state} setState={setState} activeCircleId={activeCircleId} />
        )}
        {tab === "reqs" && (
          <Requests state={state} setState={setState} search={search} filter={filter} />
        )}
        {tab === "history" && (
          <LoanHistory state={state} search={search} filter={filter} />
        )}
      </main>

      {detailsFor && (
        <DetailsModal item={detailsFor} onClose={onCloseDetails} onRequest={handleRequest} />
      )}
    </div>
  );
}
