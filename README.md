# ToolShare

Make it effortless for small, trusted circles (family, friends, neighbors) to lend/borrow DIY tools—reducing waste, saving money, and avoiding "hey do you still have my drill?" drama.

Built with **Next.js** (static export) + **Capacitor** for Android.

---

## 🚀 Getting Started for Beta Testing

**New to ToolShare?** Start here:

### 📖 [Quick Start Guide](./docs/QUICK_START.md) ← 30 minutes to live app!

**Or follow these detailed guides:**

1. **[Firebase Setup Guide](./docs/FIREBASE_SETUP.md)** - Enable Google Sign-On authentication (FREE)
2. **[Deployment Guide](./docs/DEPLOYMENT.md)** - Host your app for free ($0/month options)
3. **[Beta Testing Guide](./docs/BETA_TESTING.md)** - Distribute to friends and collect feedback

**TL;DR**: Google Sign-On is already implemented! Just set up Firebase (free), deploy to Firebase Hosting (free), and share the URL with your friends.

---

## Prerequisites

- **Node.js** 20+
- **npm** (comes with Node.js)
- **Android Studio** (for emulator testing and local builds)

## Quick Start (Web Development)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Building the Android APK

### 1. Build the web app and sync to Android

```bash
npm install
npm run build
npx cap sync android
```

### 2. Build the APK

```bash
cd android
./gradlew assembleDebug
```

The APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

### 3. Install on a connected device

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

## Installing the APK on Your Phone

If you downloaded the APK from the GitHub Actions build artifact:

1. **The download is a ZIP file**, not an APK directly. Extract/unzip it first to get `app-debug.apk`.
2. Transfer `app-debug.apk` to your phone (via USB, email, Google Drive, etc.).
3. On your phone, go to **Settings → Security** (or **Settings → Apps → Special access**) and enable **Install unknown apps** for the app you're using to open the APK (e.g., Files, Chrome).
4. Tap the APK file to install it.
5. If you see "App not installed" after a previous install, **uninstall the old version first** (the signing key changes between CI builds).

## Testing with Android Studio Emulator

### Step 1: Install Android Studio

Download and install [Android Studio](https://developer.android.com/studio) if you haven't already.

### Step 2: Open the Android Project

1. Open Android Studio.
2. Select **File → Open** (or **Open** from the welcome screen).
3. Navigate to the `android/` folder inside this project and select it.
4. Wait for Gradle sync to complete (this may take a few minutes the first time).

### Step 3: Create an Android Virtual Device (AVD)

1. In Android Studio, go to **Tools → Device Manager** (or click the phone icon in the toolbar).
2. Click **Create Virtual Device**.
3. Choose a device definition:
   - **Recommended**: Pixel 7 or Pixel 8 (these closely match real devices).
   - Click **Next**.
4. Select a system image:
   - Go to the **Recommended** tab.
   - Download and select an **API 34** (Android 14) or **API 35** (Android 15) image.
   - Prefer **x86_64** images for Intel/AMD machines, or **arm64-v8a** for Apple Silicon Macs.
   - Click **Next**.
5. Name your AVD (or keep the default), then click **Finish**.

### Step 4: Prepare the Web Assets

Before running the app, you must build the web content and sync it to the Android project:

```bash
# From the project root (not the android/ folder)
npm install
npm run build
npx cap sync android
```

### Step 5: Run on the Emulator

**Option A: From Android Studio**

1. In the toolbar, select your emulator from the device dropdown (e.g., "Pixel 7 API 34").
2. Click the green **Run ▶** button (or press `Shift+F10`).
3. Wait for the emulator to boot and the app to install and launch.

**Option B: From the command line**

```bash
# Start the emulator (replace AVD_NAME with your AVD name)
emulator -avd AVD_NAME &

# Build and install
cd android
./gradlew installDebug
```

To list your available AVDs: `emulator -list-avds`

### Step 6: Live Reload During Development (Optional)

For faster iteration, you can use Capacitor's live reload:

```bash
# Find your computer's local IP address
# macOS: ipconfig getifaddr en0
# Windows: ipconfig
# Linux: hostname -I

# Start the dev server bound to your IP
npm run dev -- --host 0.0.0.0

# Then update capacitor.config.ts temporarily:
# server: { url: 'http://YOUR_IP:3000', cleartext: true }

# Sync and run
npx cap sync android
# Then run from Android Studio
```

> **Note:** Remember to remove the `server` config before building a production APK.

### Troubleshooting

| Problem | Solution |
|---------|----------|
| "App not installed" | Uninstall any previous version of the app first, then try again. |
| Blank white screen | Run `npm run build && npx cap sync android` to ensure web assets are bundled. |
| Emulator won't start | Ensure hardware acceleration (HAXM/Hypervisor) is enabled in BIOS. |
| Gradle sync fails | Click **File → Invalidate Caches / Restart** in Android Studio. |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | Uninstall the existing app: `adb uninstall com.yourname.toolshare` |
| Build fails locally | Ensure you've run `npm run build && npx cap sync android` first. |

## Project Structure

```
toolshare/
├── src/                    # Next.js app source
│   ├── app/                # App router pages
│   ├── components/         # React components
│   └── lib/                # Utilities, types, Firebase config
├── android/                # Capacitor Android project
│   └── app/                # Android app module
├── capacitor.config.ts     # Capacitor configuration
├── next.config.ts          # Next.js configuration
└── package.json            # Dependencies and scripts
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build static export to `out/` |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest tests |
| `npx cap sync android` | Sync web assets to Android |

---

## 🔐 Authentication & Deployment

### Google Sign-On Status

✅ **Already Implemented!** The login page and Firebase Authentication are fully set up.

**To enable for production:**
1. Create a Firebase project (free)
2. Enable Google Authentication in Firebase Console
3. Add Firebase config to `.env.local`
4. Deploy your app

**Detailed instructions**: [docs/FIREBASE_SETUP.md](./docs/FIREBASE_SETUP.md)

### Hosting Options (All Free)

| Platform | Setup Time | Free Tier | Best For |
|----------|-----------|-----------|----------|
| **Firebase Hosting** | 5 min | 10 GB/month | Already using Firebase |
| **Vercel** | 2 min | 100 GB/month | Easiest deployment |
| **Netlify** | 3 min | 100 GB/month | Drag-and-drop |
| **GitHub Pages** | 5 min | Unlimited* | Open source projects |

**Estimated cost for beta testing**: **$0/month** for 10-100 users

**Detailed instructions**: [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

### Beta Testing Distribution

**Easiest approach**: Deploy the web app and share the URL
- Works on iPhone, Android, desktop
- No app store required
- Instant updates
- Zero cost

**Android APK options**:
- Firebase App Distribution (free, recommended)
- Google Play Internal Testing ($25 one-time)
- Direct APK sharing (free, manual)

**Detailed instructions**: [docs/BETA_TESTING.md](./docs/BETA_TESTING.md)

---

## 📚 Documentation

- **[Quick Start Guide](./docs/QUICK_START.md)** - Get from zero to deployed in 30 minutes
- **[Firebase Setup Guide](./docs/FIREBASE_SETUP.md)** - Configure Google Sign-On authentication
- **[Deployment Guide](./docs/DEPLOYMENT.md)** - Host your app with minimal cost
- **[Beta Testing Guide](./docs/BETA_TESTING.md)** - Distribute to friends and gather feedback

---

## 💰 Cost Estimate for Early Beta

**Realistic costs for 10-50 beta testers:**

| Service | Free Tier | Beta Cost |
|---------|-----------|-----------|
| Firebase Auth | 50K MAU | $0/month |
| Firebase Hosting | 10 GB/month | $0/month |
| Firebase App Distribution | 200 testers | $0/month |
| **Total** | | **$0/month** |

Scale to 1,000+ users before hitting any paid tiers!
