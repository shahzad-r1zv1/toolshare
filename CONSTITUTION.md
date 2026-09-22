# ToolShare Constitution

This document is the durable reference for *why* ToolShare is built the way
it is — the principles, architecture, and data model that should survive
across features, refactors, and contributors. Implementation details that
change often (exact component names, line numbers) belong in code comments
and `git log`, not here. Update this file when a decision here becomes
false, not when a detail below it changes.

## 1. Product Principles

1. **Trust boundary is the circle, not the app.** ToolShare has no public
   marketplace and no discovery across strangers. Every piece of shared
   data (items, requests, loans, messages, wishlist, consumables) is
   visible only to members of the circle(s) it belongs to. This is a
   security property, not just a UX choice — it is enforced in Firestore
   rules, not only in the UI.
2. **No payments move through the app.** Rental rates and "paid" flags are
   *tracking only*. Owner and borrower settle up outside ToolShare; the app
   never touches money. Do not add real payment processing without
   revisiting this principle deliberately (it changes the regulatory and
   liability surface significantly).
3. **Offline/local-demo mode is a first-class fallback, not a hack.**
   When Firebase isn't configured (`isConfigured` in `firebase.ts` is
   false), the app runs entirely client-side against `localStorage` with a
   seeded demo user. This exists so the app is reviewable, testable, and
   demoable with zero setup. Every feature must work in both `cloud` and
   `local` modes (see `AppStore.mode` in `src/lib/store.ts`), or explicitly
   degrade (e.g. `joinCircle` is cloud-only because it requires querying
   across users).
4. **History survives deletion.** Loans snapshot the item's title/category
   at creation time; loan history remains readable after the item itself is
   deleted or the circle is left. Prefer snapshotting over foreign-key
   lookups whenever data needs to outlive its source record.
5. **Small, real-world lending, not a marketplace at scale.** Circles are
   sized for families, friend groups, and neighbors — tens of members, not
   thousands. Design decisions (e.g. one Firestore document per circle,
   holding *all* of that circle's data) deliberately trade scalability for
   simplicity, appropriate to this scale. Revisit this tradeoff explicitly
   before assuming it holds at a different scale.

## 2. Architecture Overview

```
Next.js (static export) ──┬── Web: Firebase Hosting
                           └── Android: Capacitor wraps the static build
                                 │
                                 ├── @capacitor-firebase/authentication
                                 │     (native Google Sign-In on Android)
                                 └── Firebase JS SDK (Auth + Firestore)
                                       used directly on web
```

- **Framework**: Next.js 15 (App Router), built via `next build` as a
  **static export** (`output` is the `out/` directory) — there is no
  Next.js server at runtime. This is required because Capacitor needs a
  static asset bundle to embed in the Android WebView.
- **Styling**: Tailwind CSS v4, themed through CSS custom properties
  ("Community Kit" design system — see `src/app/globals.css`). Components
  must read colors/spacing from the token set (`--accent`, `--ink`,
  `--surface`, etc.), never hardcode hex values, so the light/dark themes
  (`prefers-color-scheme` + explicit `data-theme` override) stay correct
  everywhere including new pages.
- **Mobile shell**: Capacitor 7 wraps the same static web build for
  Android. `capacitor.config.ts` sets `webDir: "out"`. There is currently
  no iOS target.
- **Auth**: Firebase Authentication, two methods — email/password and
  Google Sign-In. On native Android, Google Sign-In goes through
  `@capacitor-firebase/authentication`'s native flow and the resulting
  credential is handed to the Firebase JS SDK (`signInWithCredential`),
  because web-based popup/redirect OAuth breaks inside the Capacitor
  WebView (`AuthContext.tsx`). On web, popup is tried first with a
  redirect fallback for browsers that block popups.
- **Data**: Firestore, single collection `circles`. See §3.

## 3. Data Model

### Firestore shape: one document per circle

Every circle is **one Firestore document** in the `circles` collection,
containing *all* of that circle's shared state:

```ts
CircleDoc = {
  name, inviteCode, memberIds, memberProfiles,
  items, requests, loans, wishlist, messages,
  waitlist, consumables, consumableClaims,
  updatedAt,
}
```

This is a deliberate choice, not the obvious "normalize into many
collections" design:

- A member only ever needs to subscribe to the small number of circle docs
  they belong to (`where("memberIds", "array-contains", userId)`), and gets
  every change in that circle — items, requests, loans, messages — from a
  **single realtime listener** per circle. No cross-collection joins, no
  N+1 listener problem.
- The tradeoff: a circle document grows with its history (items, closed
  loans, old messages all stay in the doc), and any write to the circle
  re-writes other members' unrelated data too (mitigated by `writeDocs`
  only sending docs whose *stable-stringified* content actually changed).
  This is acceptable at "family/friends/neighbors" scale (principle 5) but
  would need rethinking (e.g. splitting messages into a subcollection) if
  circles were expected to grow into the hundreds of members or thousands
  of historical loans.

### App-level `State` vs. Firestore `CircleDoc`s

The UI works against a single flattened `State` object (`src/lib/types.ts`)
that looks like one user's whole world — their items, requests, loans,
etc. across *all* their circles. Two pure functions bridge the two shapes
(`src/lib/store.ts`):

- **`assembleState(uid, name, docs)`** — merges the `CircleDoc`s the user
  belongs to into one `State`, deriving `friends` (everyone in a shared
  circle who isn't you) and each entity's list from every doc.
- **`splitState(state, prevDocs)`** — the inverse: given a new `State` (e.g.
  after a component calls `setState`), figures out which circle each
  entity now belongs to and re-partitions everything back into per-circle
  docs to write.

Components call `setState` exactly like `useState` — they don't know
whether they're in `cloud` or `local` mode, and don't touch Firestore
directly. This means **all state mutation logic (validation, conflict
checks, etc.) lives in components/hooks operating on the flat `State`
shape**, not scattered across Firestore write call sites. Keep it that way:
new state-mutating features should read/modify `State` and let
`setCloudState`/`setLocalState` handle persistence.

### Entity relationships (informal)

```
Circle (memberIds, inviteCode)
 └─ Item (ownerId, circleId)
     ├─ Request (itemId, borrowerId, status)
     ├─ Loan (itemId, borrowerId, status: ACTIVE|RETURNED)
     │   └─ Message (threadId = Request.id OR Loan.id)
     └─ WaitlistEntry (itemId, requesterId)
 └─ Consumable (ownerId, circleId)
     └─ ConsumableClaim (consumableId, claimerId)
 └─ WishlistEntry (circleId, requesterId)  — "looking for X", no Item yet
```

- A **Request** becomes a **Loan** on approval; loans are the durable
  record (with two-sided return confirmation — see below).
- A **Message**'s `threadId` is *either* a request id or a loan id;
  resolving which requires checking both maps (see `splitState`'s
  `requestItemId`/`loanItemId` lookups) since the thread persists across
  the request→loan transition.
- **Consumables** (paint, scrap wood, extra screws) are structurally
  separate from **Items**: they're claimed and decremented, not
  borrowed-and-returned. Don't conflate the two models.

### Key invariants enforced in app logic (not just types)

- **Loan return is two-sided**: the owner marks a loan `RETURNED`, and the
  borrower separately confirms (`ownerConfirmedReturn` /
  `borrowerConfirmedReturn`). Either side can also raise a `dispute`.
- **No overlapping bookings**: new and renewed loan requests are checked
  against existing approved date ranges for the same item before approval.
- **Leaving a circle is blocked** while the user has an active loan in it
  (as owner or borrower), to avoid orphaning an in-progress loan. On
  leaving, the user's *items/consumables* (and requests/waitlist entries
  that reference only those) are pruned from the circle doc; *loans* and
  their message threads are preserved so loan history survives departure.
- **Circle membership changes are additive-safe under Firestore rules**:
  a non-member may update a circle doc only to add themselves without
  removing anyone (see `firestore.rules`) — this is what makes
  invite-code joining work without a Cloud Function.

## 4. Security Model

- **Firestore rules are the actual trust boundary**, not the UI. Any
  signed-in user can *read* any circle doc (required so invite-code lookup
  works client-side), but can only *write* to a circle they're already a
  member of, or to add themselves as a new member without touching
  existing members. There is no per-field access control within a circle
  doc — once you're a member, you can read/write everything in it. Do not
  add a feature that assumes finer-grained access within a circle without
  first updating `firestore.rules` to match.
- **No secrets or PII beyond name/email/photo** are collected. See
  `src/app/privacy/page.tsx` for the authoritative, user-facing statement
  of what's collected — keep that page in sync with reality whenever the
  data model in `types.ts` changes to collect something new.
- **Rough location only.** `RoughLocation` is deliberately coarse (lat/lng
  good for "~2 mi away" estimates), not a precise address — see the doc
  comment in `types.ts`. Don't tighten this without reconsidering the
  privacy tradeoff.

## 5. Release & Deployment

- **Two independent deploy targets** from the same static build:
  1. **Firebase Hosting** (web) — `npm run build && firebase deploy`.
     Project: `toolshare-a1985`. Also hosts the standalone `/privacy` and
     `/delete-account` legal pages required for Play Store compliance.
  2. **Android** (Capacitor) — `npm run build && npx cap sync android`,
     then a Gradle build. App ID `com.shahzadrizvi.toolshare` is
     **permanent** — Google Play does not allow changing it after first
     publish. See `RELEASE.md` for the full signed-build process and
     keystore handling.
- **CI** (`.github/workflows/build-apk.yml`) builds a debug APK on every
  push to `main`, and a release APK when signing secrets are present.
  Signing secrets are never committed; see `RELEASE.md`.
- **Environment config** (`NEXT_PUBLIC_FIREBASE_*`) is required at build
  time (static export bakes it in) — there is no runtime config swap.
  Without it, the app builds and runs fine in `local` (offline demo) mode,
  which is why CI can build without secrets configured.

## 6. Testing

- **Vitest + happy-dom** for unit/integration tests (`src/__tests__/`),
  covering: store assemble/split logic, availability scheduling, invite-QR
  generation, unread-message tracking, and higher-level "workflows" and
  "scenarios" tests that exercise multi-step flows (e.g. request → approve
  → return) against the pure `State` functions without a real Firestore.
- New state-mutation logic should be tested against `assembleState` /
  `splitState` and the `State` shape directly where possible — this is
  faster and more reliable than mocking Firestore, and matches how the
  app actually separates "business logic on `State`" from "persistence."

## 7. What Changes Here vs. What Doesn't

**Update this document when:**
- A principle in §1 is deliberately overturned (e.g. adding real payments,
  allowing cross-circle discovery, dropping local-mode support).
- The Firestore document shape or trust boundary changes (§2–4).
- A new deploy target or release process is added (§5).

**Don't update this document for:**
- New features that fit within the existing entity model (new fields on
  `Item`, a new component) — those belong in `CHANGELOG.md`.
- Routine dependency bumps, styling tweaks, or bug fixes.
