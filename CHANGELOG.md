# Changelog

All notable changes to this project are documented in this file.

## [Unreleased] - 2026-07-26

### Added
- **Loan renewals**: borrowers can request an extension on an active loan; approving a renewal request extends the existing loan's due date instead of creating a new one, with the same overlap-conflict check as new requests.
- **Due-date digest**: a D-1 / due-today / overdue summary surfaces loans the current user is involved in (as borrower or owner) that need attention, independent of the active search/filter.
- **Wishlist** (`src/components/Wishlist.tsx`): circle members can post items they're looking to borrow, visible to the whole circle.
- **QR code invites** (`src/components/InviteQRCode.tsx`): circle invite codes can now be shared as a scannable QR code in addition to the plain code, via the new `qrcode` dependency.
- **Leave circle**: members can leave a circle they've joined; blocked while they have an active loan in that circle (as borrower or owner) to avoid orphaning in-progress loans.
- Loans now snapshot the item's title/category at creation time (`itemTitle`, `itemCategory`), so loan history remains readable after the underlying item is deleted.

### Changed
- Reworked the visual theme across the app (`globals.css`, `ui.tsx`, and all major components) onto a consistent design token system (`ink`, `surface`, `accent`, `bad`, `warn`, etc.) replacing ad hoc Tailwind gray/emerald classes.
- Local storage schema bumped (`toolshare_state_final_v9` → `v10`) with automatic backfill of `wishlist` and loan item-snapshot fields for previously saved state.

### Fixed
- Prevented double-booking via overlapping-date conflict checks on new and renewed loan requests (carried over from the prior commit, extended to cover renewals).

Older history is available via `git log`; this file starts tracking from the current in-progress feature set.
