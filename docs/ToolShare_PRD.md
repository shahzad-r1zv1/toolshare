# ToolShare — Product Requirements Document (PRD)
**Date:** 09.18.2025  
**Owner:** SR

---

## 1. Overview
### Vision
Make it effortless for small, trusted circles (family, friends, neighbors) to lend/borrow DIY tools—reducing waste, saving money, and avoiding “hey do you still have my drill?” drama.

### Problem
People forget who has what, when it’s due back, and the condition it was in. Chat threads are messy, memory is unreliable, and misunderstandings are common.

### Solution (MVP)
A mobile-friendly app to:
- Post tools (photos, category, condition notes, replacement value).
- Request tools (pick dates).
- Approve/decline requests (owner).
- Track active loans (with due dates).
- Return flow (before/after photos + notes).
- Private circles with invite codes.
- Search/filter items by title/category.
- Export/Import JSON to share state across friends (pre-backend).
- Optional reminders (push) near due date.

### Non-Goals (for MVP)
- Public discovery/marketplace.
- Payments/deposits/escrow.
- Ratings/reviews at scale.
- Complex logistics (delivery, routing).

---

## 2. Objectives & Success
### North Star Metric
- **Completed loans per active circle per month.**

### Supporting Metrics
- Activation: % of new users who join a circle and add ≥1 item in 24h.
- Request Rate: # requests / active user / week.
- Approval Rate: % of requests approved within 24h.
- Return Compliance: % returned on/before due date.
- Friction: % flows abandoned at date selection or approval.
- Reliability: Crash-free sessions; median request-to-approval latency.

### OKRs (first 6–8 weeks)
**O1: Validate core sharing loop.**  
- KR1: 70% of invited users complete first loan within 7 days.  
- KR2: Median time from request → approval < 6 hours.

**O2: Reduce return friction.**  
- KR1: ≥85% loans have return photos/notes.  
- KR2: Late returns < 10%.

**O3: HCI excellence.**  
- KR1: System Usability Scale (SUS) ≥ 80.  
- KR2: <1% users report confusion in request/return.

---

## 3. Users & Jobs-to-be-Done
### Personas
- **Owner-Olivia:** Owns many tools; wants clarity on who has what and when it returns.
- **Borrower-Ben:** Needs a tool this weekend; wants a fast yes/no and clear pickup/return.
- **Organizer-Avi:** Sets up the family/neighbor circle, invites members, nudges adoption.

### JTBD
- “When I need a tool, help me quickly see what’s available in my circle and borrow it without chasing people.”
- “When I lend a tool, help me track who has it and get it back on time without awkward reminders.”

---

## 4. Scope & Priorities
### MVP Must-Haves
- Post items (photos, category, notes, replacement value).
- Request with date range.
- Approve/decline → active loan.
- Track active loans with due dates.
- Return flow (photos + notes).
- Circles via invite code.
- Search & filter items.
- Export/Import JSON backup & sharing.
- Local push reminder (D-1, D, D+1).

### Should-Haves
- Availability hints.
- Late flag & gentle nudge.

### Could-Haves
- Quick-share links for specific items to circle members.
- “Frequently borrowed” section.

### Won’t-Have (now)
- Payments/deposits.
- Public listings.

---

## 5. Functional Requirements
### Circles
- Create circle → generate invite code.
- Join via code → member added, sees items/requests.
- Switch between multiple circles.
- Visibility scoped to circle.

### Items
- Fields: title, photos (≤3), category, notes, replacement value, availability text.
- Owner can edit/delete their item.
- Search by title/notes; filter by category.

### Requests
- Borrower selects start/end date.
- Owner sees incoming requests; approve/decline.
- On approval: request → loan.

### Loans
- States: ACTIVE → RETURNED (or flagged LATE if overdue).
- Owner/borrower can view loan details at any time.

### Returns
- Borrower uploads photos, leaves notes.
- Owner confirms → moves to RETURNED.

### Reminders
- Notify borrower: D-1, D, D+1 at 9am.

### Backup & Restore
- Export state → downloadable JSON.
- Import JSON → replace app state.
- Provides sharing & recovery.

---

## 6. Access & Roles
| Action           | Owner | Borrower | Other Circle Member |
|------------------|-------|----------|----------------------|
| View item        | ✅    | ✅       | ✅                   |
| Edit item        | ✅    | ❌       | ❌                   |
| Request item     | ❌    | ✅       | ✅                   |
| Approve/decline  | ✅    | ❌       | ❌                   |
| View loan        | ✅    | ✅       | ❌                   |
| Confirm return   | ✅    | ❌       | ❌                   |

---

## 7. Non-Functional Requirements
- **Privacy:** Circle-scoped access; no public endpoints.
- **Security:** Client-side trust acceptable for MVP; AWS auth later.
- **Reliability:** Local persistence; Export/Import JSON prevents data loss.
- **Performance:** <150ms interactions; compressed images.
- **Accessibility:** Keyboard access, labeled inputs, high contrast, ESC to close modals.

---

## 8. Data Model
**Entities**
- User { id, name, circles[] }
- Circle { id, name, inviteCode, members[] }
- Item { id, ownerId, circleId, title, category, photos[], note, rv, avail, createdAt }
- Request { id, itemId, borrowerId, startDate, endDate, status, createdAt }
- Loan { id, itemId, borrowerId, startDate, endDate, status, returnPhotos[], returnNotes }

**State Invariants**
- Request must reference Item whose circle includes both owner & borrower.
- Loan only exists if originating Request approved.
- Item cannot be requested by its owner.

**State Machines**
- Request: PENDING → APPROVED / DECLINED.
- Loan: ACTIVE → RETURNED (or flagged LATE).

**Algorithms**
- Overlap detection: max(start1, start2) ≤ min(end1, end2).
- Reminder scheduling: D-1, D, D+1 at 9am.
- Image handling: resize before save, ≤3 photos.

---

## 9. API & Backend Plan
### Local-first (MVP)
- `localStorage` for persistence.
- Export/Import JSON for sync.

### AWS (later)
- Cognito → authentication.
- AppSync (GraphQL) over DynamoDB → data.
- S3 → photo storage.
- SNS → push notifications.

---

## 10. UX Flows (Procedural)
1. Add Item → My Items → Save.
2. Request → Approve/Decline → Active Loan.
3. Return → Photos + Notes → Confirm → RETURNED.
4. Circle → Create (code) → Join via code → Switch circles.
5. Backup → Export JSON → Share → Import JSON.

---

## 11. Edge Cases & Rules
- Dates must be valid (not past).
- Owner cannot request own item.
- Max 3 photos per item.
- Overlap requests not approved.
- Return idempotency enforced.

---

## 12. QA Plan
### Smoke Tests
- Add, Request, Approve, Return flows.

### Functional
- Date validation, overlap detection, persistence.

### Regression
- Editing items doesn’t break loans.
- Cancel modals restore focus/scroll.

---

## 13. Risks & Mitigations
- Data loss → mitigated by Export/Import JSON.
- Privacy → invite-only circles.
- Late returns → gentle nudges.
- Image bloat → compression.
- Scope creep → OKRs + RICE prioritization.

---

## 14. Rollout Plan
- **Week 0:** Local MVP shipped as APK.
- **Week 1:** Circles + search refinement.
- **Week 2:** AWS backend migration.
- **Week 3:** Push reminders + Play Store internal testing.
- **Week 4:** Hardening, analytics, SUS survey.
