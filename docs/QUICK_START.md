# Quick Start Guide for Beta Testing

**Goal**: Get ToolShare running with Google Sign-On and share it with friends in under 30 minutes.

---

## Step 1: Set Up Firebase (10 minutes)

Firebase provides free authentication for up to 50,000 monthly users.

### Actions

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project** → Name it `toolshare` → Disable Analytics → **Create**
3. Click **Web icon** (`</>`) → App nickname: `ToolShare Web` → **Register**
4. **Copy the config values** (you'll need them in Step 2)
5. Go to **Authentication** → **Get started** → **Sign-in method** → **Google** → **Enable** → Add your email → **Save**
6. Click **Android icon** → Package name: `com.yourname.toolshare` → Download `google-services.json` → Save for later

**Done!** Firebase is ready.

---

## Step 2: Configure Your Local Environment (2 minutes)

### Actions

1. Clone the repository:
   ```bash
   git clone https://github.com/shahzad-r1zv1/toolshare.git
   cd toolshare
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.local.example .env.local
   ```

4. Edit `.env.local` and paste your Firebase config from Step 1:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
   ```

**Done!** Your local environment is configured.

---

## Step 3: Test Locally (5 minutes)

### Actions

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000)

3. You should see the login page with **"Sign in with Google"** button

4. Click the button and sign in with your Google account

5. Explore the app:
   - Add a tool to your circle
   - Browse available tools
   - Test the search feature

**Done!** Google Sign-On is working locally.

---

## Step 4: Deploy to Firebase Hosting (5 minutes)

Firebase Hosting is free (10 GB storage, 360 MB/day bandwidth) and perfect for beta testing.

### Actions

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. Initialize Firebase Hosting:
   ```bash
   firebase init hosting
   ```

   Configuration:
   - **Use existing project**: Select your project from Step 1
   - **Public directory**: `out`
   - **Single-page app**: `Yes`
   - **GitHub deploys**: `No` (or `Yes` if you want automatic deploys)
   - **Overwrite index.html**: `No`

3. Build and deploy:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

4. Your app is live! Copy the URL (something like `https://your-project.web.app`)

**Done!** Your app is deployed and accessible to anyone.

---

## Step 5: Test Production App (3 minutes)

### Actions

1. Open your Firebase Hosting URL in a new browser (use incognito/private mode)

2. Test the full flow:
   - Sign in with Google (should show Google's OAuth popup)
   - Add a tool
   - Create or join a circle
   - Sign out and sign back in

3. Test on mobile:
   - Open the URL on your phone
   - Sign in with Google
   - Everything should work smoothly

**Done!** Production deployment is verified.

---

## Step 6: Share with Friends (5 minutes)

### Actions

1. **Prepare your invite message** (customize this):

   ```
   👋 Hey! I built an app to help us share tools.

   🔧 ToolShare: https://your-project.web.app

   You can:
   - See what tools everyone has
   - Request to borrow something
   - Track who borrowed what

   Sign in with your Google account to try it!
   Let me know what you think.
   ```

2. **Share the URL** via:
   - Text message / WhatsApp
   - Email
   - Group chat

3. **Create a circle** for your group:
   - In the app, note the **Circle Code** (shown in the header)
   - Share the code with your friends
   - They can join your circle and see your tools

4. **Collect feedback**:
   - Ask friends about their experience
   - Note any bugs or issues
   - Listen to feature requests

**Done!** Your friends can now use the app.

---

## Optional: Build Android APK

If you want a native Android app (not required - the web app works great on phones):

### Actions

1. Build the web app:
   ```bash
   npm run build
   npx cap sync android
   ```

2. Build the APK:
   ```bash
   cd android
   ./gradlew assembleDebug
   ```

3. APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

4. Install on your phone:
   ```bash
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```

**For distributing to friends**, see [BETA_TESTING.md](./BETA_TESTING.md) for Firebase App Distribution or Google Play Internal Testing options.

---

## Troubleshooting

### Issue: "Firebase is not configured"

**Solution**:
- Verify `.env.local` exists and has all 6 variables
- Restart your dev server: `Ctrl+C` then `npm run dev`

### Issue: Google Sign-In popup closes immediately

**Solution**:
- In Firebase Console → **Authentication** → **Settings** → **Authorized domains**
- Add `localhost` for development
- For production, your Firebase Hosting domain should be auto-added

### Issue: "This app is not verified" warning during sign-in

**Solution**:
- This is normal during development
- Click **Advanced** → **Go to [your app] (unsafe)**
- For production launch, you can verify your app with Google (optional)

### Issue: Build fails

**Solution**:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Try build again
npm run build
```

---

## What's Next?

✅ **You now have**:
- Google Sign-On working
- App deployed and accessible to anyone
- Friends using the app

**Next steps**:

1. **Gather feedback** from your first 5-10 users
2. **Iterate** on features based on their needs
3. **Consider**:
   - Custom domain (Firebase Hosting supports this)
   - Analytics (Firebase Analytics is free)
   - Crash reporting (Firebase Crashlytics)
   - Push notifications (when you're ready)

**Need more details?** See:
- [Firebase Setup Guide](./FIREBASE_SETUP.md) - Detailed Firebase configuration
- [Deployment Guide](./DEPLOYMENT.md) - Alternative hosting options (Vercel, Netlify, etc.)
- [Beta Testing Guide](./BETA_TESTING.md) - Advanced distribution methods

---

## Cost Summary

| What | Cost |
|------|------|
| Firebase Authentication | $0 (up to 50K users) |
| Firebase Hosting | $0 (10 GB, 360 MB/day) |
| Domain (optional) | $10-15/year |
| **Total for Beta** | **$0/month** |

You can comfortably support 50-100 beta testers without any costs!

---

## Questions?

Check the detailed guides in the `docs/` folder or open an issue on GitHub.

Happy testing! 🎉
