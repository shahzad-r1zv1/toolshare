# ToolShare

Make it effortless for small, trusted circles (family, friends, neighbors) to lend/borrow DIY tools — reducing waste, saving money, and avoiding "hey do you still have my drill?" drama.

Built with **Next.js** (static export) + **Capacitor** for Android, backed by **Firebase** (Auth + Firestore).

For the *why* behind these choices — the data model, security boundary, and principles that should stay stable across features — see **[CONSTITUTION.md](./CONSTITUTION.md)**. This README covers day-to-day dev workflow.

---

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). With no Firebase config, the app runs in **offline demo mode** — a local single-user sandbox with sample data (data stays in the browser). This is the fastest way to poke at the app; no setup required.

To run against real accounts and shared data between people, configure Firebase — see [docs/QUICK_START.md](./docs/QUICK_START.md) (~30 min, free tier) or [docs/FIREBASE_SETUP.md](./docs/FIREBASE_SETUP.md) for just the auth setup.

## What's Implemented

- Email/password accounts (create, sign in, password reset) and Google Sign-In
- Real-time shared data via Firestore — circles, items, requests, and loans sync between all members of a circle
- Invite codes (6-character) and QR-code invites to join a circle
- Two-sided loan return confirmation, overlap-conflict checking on bookings, loan renewals
- Wishlist ("looking for X") and consumables (paint, scrap wood — claimed and decremented, not borrowed/returned)
- In-app messaging per request/loan thread
- Offline demo mode when Firebase isn't configured

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build static export to `out/` |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest tests (`src/__tests__/`) |
| `npx cap sync android` | Sync web assets into the Android project |

## Project Structure

```
toolshare-web/
├── src/
│   ├── app/                # Next.js App Router pages (/, /login, /privacy, /delete-account)
│   ├── components/         # UI components
│   ├── lib/                # store.ts (Firestore↔State sync), types.ts, AuthContext, firebase.ts
│   └── __tests__/          # Vitest unit/integration tests
├── android/                 # Capacitor Android project
├── capacitor.config.ts
├── firestore.rules
├── CONSTITUTION.md          # Architecture, data model, and durable principles
├── RELEASE.md               # Signed Android release build + Play Store process
└── docs/                    # Step-by-step setup/deployment/beta-testing guides
```

## Building the Android App

```bash
npm run build            # static export to out/
npx cap sync android      # copy the web build into the Android project
cd android
./gradlew assembleDebug   # unsigned debug APK, for sideloading
```

Debug APK lands at `android/app/build/outputs/apk/debug/app-debug.apk`. For a **signed release build** (required for the Play Store), see **[RELEASE.md](./RELEASE.md)**.

`.github/workflows/build-apk.yml` builds a debug APK on every push to `main` (and a signed release APK if signing secrets are configured) — useful for grabbing a build without a local Android toolchain.

### Running on an emulator / device

1. Install [Android Studio](https://developer.android.com/studio) and create a virtual device (Tools → Device Manager), or connect a physical device with USB debugging enabled.
2. `npm run build && npx cap sync android`
3. Open `android/` in Android Studio and hit **Run**, or `cd android && ./gradlew installDebug`.

If you hit `INSTALL_FAILED_UPDATE_INCOMPATIBLE`, uninstall the previously installed build first — the debug and release signing keys differ.

## Deployment (Web)

```bash
npm run build
firebase deploy --only hosting
```

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for hosting alternatives (Vercel, Netlify, GitHub Pages) and cost estimates.

## Beta Testing & Publishing

- **Web**: deploy and share the URL — works on any device, no app store needed.
- **Android APK**: Firebase App Distribution, Google Play Internal Testing, or direct APK sharing. See [docs/BETA_TESTING.md](./docs/BETA_TESTING.md).
- **Play Store submission**: see [RELEASE.md](./RELEASE.md) for the signed build process; the store listing, content rating, and data safety declarations are handled directly in Play Console.

## Documentation

- **[CONSTITUTION.md](./CONSTITUTION.md)** — architecture, data model, security boundary, and product principles
- **[docs/QUICK_START.md](./docs/QUICK_START.md)** — zero to deployed in ~30 minutes
- **[docs/FIREBASE_SETUP.md](./docs/FIREBASE_SETUP.md)** — configure Google Sign-In and Firestore
- **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)** — hosting options
- **[docs/BETA_TESTING.md](./docs/BETA_TESTING.md)** — distributing to testers
- **[RELEASE.md](./RELEASE.md)** — signed Android release builds and Play Store publishing
- **[CHANGELOG.md](./CHANGELOG.md)** — notable changes over time
