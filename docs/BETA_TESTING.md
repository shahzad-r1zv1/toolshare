# Beta Testing Guide for ToolShare

This guide covers how to distribute ToolShare to your friends for early beta testing with **minimal cost and friction**.

## Quick Start Checklist

Before inviting beta testers:

- [ ] Firebase Authentication configured ([FIREBASE_SETUP.md](./FIREBASE_SETUP.md))
- [ ] Web app deployed to hosting ([DEPLOYMENT.md](./DEPLOYMENT.md))
- [ ] Android APK built and tested (see below)
- [ ] Test the full flow yourself (sign in, add items, etc.)
- [ ] Prepare onboarding instructions for testers

---

## Web App Distribution (Easiest)

**Recommended for initial beta testing**: Just share the web app URL!

### Advantages

✅ **Zero install friction**: Works on any device with a browser
✅ **Instant updates**: Deploy once, all users get updates
✅ **Cross-platform**: Works on iPhone, Android, desktop
✅ **No app store approval**: Start testing immediately

### Steps

1. **Deploy your web app** (see [DEPLOYMENT.md](./DEPLOYMENT.md))
2. **Share the URL** with beta testers:
   - Firebase: `https://your-project.web.app`
   - Vercel: `https://your-project.vercel.app`
   - Netlify: `https://your-project.netlify.app`

3. **Send onboarding instructions**:

```
👋 Welcome to ToolShare Beta!

ToolShare helps us share tools without the "hey do you still have my drill?" drama.

🌐 Web App: https://your-project.web.app

📱 To use on your phone:
1. Open the link in Chrome/Safari
2. Tap the share button
3. Select "Add to Home Screen"
4. Now it works like a native app!

🔐 Sign in with your Google account to get started.

Let me know if you have any issues!
```

### Progressive Web App (PWA) Installation

Users can "install" the web app to their home screen:

**On Android (Chrome)**:
1. Open the app URL
2. Tap the three dots menu
3. Tap "Add to Home Screen"
4. Tap "Add"

**On iPhone (Safari)**:
1. Open the app URL
2. Tap the Share button
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add"

**Note**: To fully enable PWA features, you'd need to add a manifest and service worker. For early beta, a bookmark works fine.

---

## Android APK Distribution

### Option 1: Firebase App Distribution (Recommended)

**Best for**: Organized beta testing, tracking testers, minimal cost

#### Why Firebase App Distribution?

- ✅ **Free for up to 200 testers**
- ✅ **Managed distribution**: Email invites, automatic updates
- ✅ **Crash reporting**: See what's breaking
- ✅ **iOS support**: When you build iOS version
- ✅ **Estimated cost**: $0/month

#### Setup Steps

1. **Enable Firebase App Distribution**:
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **Build your APK**:
   ```bash
   npm run build
   npx cap sync android
   cd android
   ./gradlew assembleRelease  # or assembleDebug for testing
   ```

3. **Upload to Firebase**:
   ```bash
   firebase appdistribution:distribute \
     app/build/outputs/apk/debug/app-debug.apk \
     --app YOUR_FIREBASE_APP_ID \
     --groups "beta-testers" \
     --release-notes "First beta release"
   ```

4. **Invite testers**:
   - Go to Firebase Console → **App Distribution**
   - Click **Testers & Groups** → **Add testers**
   - Enter email addresses
   - They'll receive an invite link

5. **Testers install**:
   - Open invite email on Android phone
   - Download Firebase App Tester app from Play Store
   - Install ToolShare through Firebase App Tester

#### Automate with GitHub Actions

Create `.github/workflows/distribute-android.yml`:

```yaml
name: Build and Distribute Android APK

on:
  push:
    branches: [ beta ]
    tags: [ 'v*' ]

jobs:
  build-and-distribute:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Setup JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Install dependencies
        run: npm ci

      - name: Build web app
        run: npm run build
        env:
          NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.NEXT_PUBLIC_FIREBASE_API_KEY }}
          NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN }}
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}
          NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: ${{ secrets.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET }}
          NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID }}
          NEXT_PUBLIC_FIREBASE_APP_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_APP_ID }}

      - name: Sync to Capacitor
        run: npx cap sync android

      - name: Build APK
        run: |
          cd android
          ./gradlew assembleDebug

      - name: Distribute to Firebase
        uses: wzieba/Firebase-Distribution-Github-Action@v1
        with:
          appId: ${{ secrets.FIREBASE_APP_ID }}
          serviceCredentialsFileContent: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          groups: beta-testers
          file: android/app/build/outputs/apk/debug/app-debug.apk
          releaseNotes: "Beta build from GitHub Actions"
```

### Option 2: Google Play Internal Testing

**Best for**: Future public launch, professional distribution

#### Why Google Play Internal Testing?

- ✅ **Professional**: Standard Android distribution
- ✅ **Trusted**: No "unknown sources" warnings
- ✅ **Up to 100 testers**: Free internal testing track
- ✅ **Staged rollout**: Control who gets updates
- ❌ **Takes time**: Initial review can take days
- ❌ **More setup**: Requires Play Console account

#### Setup Steps

1. **Create Google Play Developer account** ($25 one-time fee)
2. **Create app in Play Console**
3. **Generate release APK**:
   ```bash
   cd android
   ./gradlew assembleRelease
   # Sign with your release keystore
   ```
4. **Upload to Internal Testing track**
5. **Add tester email addresses**
6. **Share opt-in link** with testers

**Cost**: $25 one-time fee for Google Play Developer account

### Option 3: Direct APK Distribution

**Best for**: Quickest start, technical testers, very small group

#### Why Direct APK?

- ✅ **Instant**: No platform signup required
- ✅ **Free**: Zero cost
- ✅ **Simple**: Just share a file
- ❌ **Manual updates**: You need to send new APKs
- ❌ **"Unknown sources"**: Users need to enable installation
- ❌ **Not scalable**: Hard to manage >10 testers

#### Setup Steps

1. **Build APK**:
   ```bash
   npm run build
   npx cap sync android
   cd android
   ./gradlew assembleDebug
   ```

2. **APK location**: `android/app/build/outputs/apk/debug/app-debug.apk`

3. **Share APK**:
   - Upload to Google Drive / Dropbox
   - Share link with testers
   - Or send via email/WhatsApp

4. **Installation instructions for testers**:

```
📱 Installing ToolShare Beta (Android)

1. Download the APK from: [your-link]
   (It will be a ZIP file from GitHub - extract it first!)

2. On your phone, go to Settings → Security (or Apps)
   Enable "Install unknown apps" for Chrome/Files

3. Tap the downloaded APK file to install

4. Open ToolShare and sign in with Google

⚠️ If you see "App not installed":
   Uninstall any previous version first, then try again.

Need help? Message me!
```

---

## Recommended Beta Testing Approach

### Phase 1: Friends & Family (1-5 testers)

**Best method**: Direct APK distribution or web app
**Goal**: Validate core functionality
**Duration**: 1-2 weeks

**What to test**:
- [ ] Sign in with Google works
- [ ] Adding/viewing items works
- [ ] Creating circles works
- [ ] Requesting/lending tools works
- [ ] General usability feedback

### Phase 2: Extended Circle (5-20 testers)

**Best method**: Firebase App Distribution + web app
**Goal**: Find edge cases, gather feedback
**Duration**: 2-4 weeks

**What to test**:
- [ ] Multiple circles interaction
- [ ] Loan history tracking
- [ ] Search and filters
- [ ] Performance with realistic data
- [ ] Feature requests

### Phase 3: Community Beta (20-100 testers)

**Best method**: Google Play Internal Testing (optional)
**Goal**: Prepare for public launch
**Duration**: 4-8 weeks

**What to test**:
- [ ] Scale testing with real communities
- [ ] Long-term usage patterns
- [ ] Social features (invites, circles)
- [ ] Polish and refinement

---

## Collecting Feedback

### Simple Feedback Form

Create a Google Form or Typeform with questions:

1. What device are you using? (Android / iPhone / Desktop)
2. How easy was it to get started? (1-5 scale)
3. Did you encounter any bugs or issues?
4. What feature would you most like to see added?
5. Would you recommend ToolShare to others?
6. Any other feedback?

**Share the form** alongside the app link.

### In-App Feedback (Future Enhancement)

Consider adding a "Send Feedback" button that opens:
- Your email: `mailto:your-email@example.com?subject=ToolShare Feedback`
- Or a feedback form URL

### Firebase Crashlytics (Recommended)

To automatically catch crashes:

1. Enable in Firebase Console: **Crashlytics**
2. Add to your app (minimal code changes)
3. See crash reports in Firebase Console

---

## Cost Summary for Beta Testing

| Method | Setup Cost | Monthly Cost | Best For |
|--------|-----------|--------------|----------|
| **Web App Only** | $0 | $0 | Quickest start, everyone |
| **Firebase App Distribution** | $0 | $0 | 5-200 testers, organized |
| **Direct APK** | $0 | $0 | 1-10 testers, quick test |
| **Google Play Internal** | $25 (one-time) | $0 | Professional, future launch |

**Recommended for early beta**: **Web App + Firebase App Distribution** = **$0 total**

---

## Tester Communication Template

Here's an email/message template to send your beta testers:

```
Subject: 🔧 You're invited to test ToolShare!

Hi [Name],

You're invited to help test ToolShare - an app that makes it easy for
our circle to share tools without the "wait, who has my drill?" drama!

🌐 Web App: https://your-project.web.app
📱 Android App: [Firebase App Distribution link or APK link]

WHAT IT DOES:
- Track who has what tools in our group
- Request to borrow something
- Keep history of all loans
- No more forgotten returns!

HOW TO GET STARTED:
1. Open the link above
2. Sign in with your Google account
3. Join our circle with code: [CIRCLE-CODE]
4. Add your tools or browse what others have

THIS IS BETA - EXPECT BUGS:
- Some features are still rough
- Things might break (sorry!)
- Your feedback is gold - tell me everything!

📝 Feedback form: [your-google-form-link]

Questions? Just reply to this email.

Thanks for helping test this!
[Your name]
```

---

## Next Steps

1. Choose your distribution method (web app is easiest!)
2. Set up Firebase if not done ([FIREBASE_SETUP.md](./FIREBASE_SETUP.md))
3. Deploy web app ([DEPLOYMENT.md](./DEPLOYMENT.md))
4. Build and test APK locally first
5. Invite 2-3 close friends to start
6. Collect feedback and iterate
7. Expand to more testers

**Remember**: Start small, iterate fast, and listen to your testers!
