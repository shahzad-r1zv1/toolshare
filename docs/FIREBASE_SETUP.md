# Firebase Setup Guide for ToolShare

This guide will help you set up Firebase Authentication with Google Sign-In for ToolShare. This is **required** for the production app, but the app works in dev mode without Firebase.

## Why Firebase?

Firebase Authentication with Google Sign-In is chosen for:
- **Free tier**: 50,000 monthly active users at no cost
- **No backend needed**: Fully managed authentication service
- **Security**: Industry-standard OAuth 2.0 implementation
- **Minimal cost**: Perfect for early beta testing with friends

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project** (or select an existing project)
3. Enter project name: `toolshare` (or your preferred name)
4. Disable Google Analytics (optional, but recommended to keep costs minimal)
5. Click **Create project**

## Step 2: Register Your Web App

1. In the Firebase Console, click the **Web** icon (`</>`) to add a web app
2. Enter app nickname: `ToolShare Web`
3. Check **"Also set up Firebase Hosting"** (optional - see DEPLOYMENT.md)
4. Click **Register app**
5. Copy the Firebase configuration values (you'll need these in Step 5)

## Step 3: Enable Google Authentication

1. In Firebase Console, go to **Build** → **Authentication**
2. Click **Get started**
3. Go to the **Sign-in method** tab
4. Click **Google** in the providers list
5. Toggle **Enable**
6. Set **Project support email** (your email)
7. Click **Save**

## Step 4: Configure Android App (for APK)

1. In Firebase Console, click the **Android** icon to add an Android app
2. Enter Android package name: `com.yourname.toolshare` (must match `android/app/build.gradle`)
3. Download `google-services.json`
4. Place it in `android/app/google-services.json`
5. Click **Continue** through the remaining steps

> **Note**: You may want to customize the package name. Edit `android/app/build.gradle` and update `applicationId` to match your domain (e.g., `com.yourdomain.toolshare`).

## Step 5: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and fill in your Firebase configuration values from Step 2:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
   ```

3. **Important**: Never commit `.env.local` to git (it's already in `.gitignore`)

## Step 6: Configure Authorized Domains

### For Web Development (localhost)

By default, Firebase allows `localhost` for development. No additional configuration needed.

### For Firebase Hosting

If using Firebase Hosting (recommended for minimal cost), your domain will be automatically authorized:
- `your-project.web.app`
- `your-project.firebaseapp.com`

### For Custom Domain

1. In Firebase Console, go to **Authentication** → **Settings** → **Authorized domains**
2. Click **Add domain**
3. Enter your custom domain (e.g., `toolshare.yourdomain.com`)
4. Click **Add**

### For Android App

The Android app uses deep links and requires additional configuration:

1. Generate SHA-1 fingerprint for your debug keystore:
   ```bash
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```

2. In Firebase Console, go to **Project settings** → **Your apps** → **Android app**
3. Click **Add fingerprint**
4. Paste the SHA-1 fingerprint
5. Click **Save**

For production APKs, repeat with your release keystore fingerprint.

## Step 7: Test the Integration

### Web Testing

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000)
3. You should be redirected to `/login`
4. Click **Sign in with Google**
5. Complete the Google sign-in flow
6. You should be redirected to the main app

### Android Testing

1. Build and sync:
   ```bash
   npm run build
   npx cap sync android
   ```

2. Open in Android Studio:
   ```bash
   cd android
   # Open in Android Studio or run:
   ./gradlew installDebug
   ```

3. Launch the app and test Google Sign-In

## Troubleshooting

### "Firebase is not configured" message

- Check that `.env.local` exists and has all required values
- Restart your dev server after creating/modifying `.env.local`
- Verify the values are prefixed with `NEXT_PUBLIC_`

### Google Sign-In popup closes immediately

- Check **Authorized domains** in Firebase Console
- Ensure your domain (localhost, Firebase Hosting, or custom) is listed

### "This app is not verified" warning

During development and early beta, users may see a warning. This is normal:
1. Click **Advanced**
2. Click **Go to [your-app] (unsafe)**
3. This warning disappears once you verify your app with Google (optional, for public launch)

### Android sign-in fails

- Verify `google-services.json` is in `android/app/`
- Check SHA-1 fingerprint is added to Firebase Console
- Ensure package name matches between Firebase and `android/app/build.gradle`
- Run `npx cap sync android` after any Firebase configuration changes

### "API key not valid" error

- Verify your API key in `.env.local` matches Firebase Console
- Check that the API key has no restrictions that block your domain
- In Firebase Console, go to **Google Cloud Console** → **APIs & Services** → **Credentials** and verify restrictions

## Cost Considerations

Firebase Authentication is **free** for up to 50,000 monthly active users (MAUs). This is perfect for:
- Early beta testing with friends
- Small community/circle apps
- Personal/family tool sharing

Additional costs only apply if you:
- Exceed 50,000 MAUs ($0.0025/MAU above the limit)
- Enable phone authentication ($0.01-0.06 per verification)
- Use other Firebase services (Firestore, Storage, etc.)

**For ToolShare's early beta phase, expect $0/month in Firebase costs.**

## Next Steps

Once Firebase is configured, see:
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Hosting options and deployment guide
- [BETA_TESTING.md](./BETA_TESTING.md) - Distributing your app to friends
