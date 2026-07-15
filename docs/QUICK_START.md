# Quick Start: From Zero to a Live, Shareable App

**Goal**: ToolShare live on the internet, with real accounts (email/password **and** Google) and real shared data between friends. Time: ~30 minutes. Cost: $0.

ToolShare has two modes:

- **Offline demo mode** — no setup at all. `npm run dev`, open the app, and you get a local sandbox with sample data (badge says "Offline demo"). Data never leaves the browser.
- **Cloud mode** — Firebase configured. Real login, and circles/items/requests sync between everyone through Firestore in real time. This is what you deploy.

---

## Step 1: Create the Firebase project (5 min)

1. Go to [console.firebase.google.com](https://console.firebase.google.com/) and sign in with your Google account.
2. Click **Create a project** → name it `toolshare` → Analytics is optional (Disable is fine) → **Create project**.
3. When it opens, click the **Web icon (`</>`)** on the project home page.
4. App nickname: `ToolShare Web` → **Register app** (skip Hosting checkbox for now).
5. You'll see a `firebaseConfig` code block. **Keep this tab open** — you'll copy these values in Step 4.

## Step 2: Enable sign-in methods (3 min)

In the Firebase Console, left sidebar → **Build → Authentication** → **Get started**, then on the **Sign-in method** tab:

1. Click **Email/Password** → toggle **Enable** → **Save**.
2. Click **Add new provider** → **Google** → toggle **Enable** → pick a support email → **Save**.

That's both login options the app offers.

## Step 3: Enable Firestore (the shared database) (3 min)

1. Left sidebar → **Build → Firestore Database** → **Create database**.
2. Pick a location near you (e.g., `us-central1` / `northamerica-northeast1`) → **Next**.
3. Choose **Start in production mode** → **Create**. (Our own rules get deployed in Step 6; production mode just means "locked until rules say otherwise".)
4. Go to the **Rules** tab, replace the contents with the rules from this repo's [`firestore.rules`](../firestore.rules), and click **Publish**. (If you use the Firebase CLI in Step 6, `firebase deploy` can do this for you instead.)

## Step 4: Configure the app locally (2 min)

In the project folder:

```bash
cp .env.local.example .env.local     # PowerShell: copy .env.local.example .env.local
```

Open `.env.local` and fill in the values from the `firebaseConfig` block in Step 1:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=toolshare-xxxxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=toolshare-xxxxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=toolshare-xxxxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

(Lost the config? Firebase Console → ⚙️ **Project settings** → **General** → scroll to **Your apps**.)

## Step 5: Test locally (5 min)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should land on the login page (no "Offline demo" badge after login — if you see that badge, `.env.local` isn't being picked up; restart the dev server).

Try the real flow:

1. **Create Account** tab → enter name/email/password → you land on the welcome screen.
2. Create a circle → note the **invite code** in the header (click it to copy).
3. **My Items** → add a tool.
4. Open a second browser (or incognito window), sign in with a *different* account (e.g., "Continue with Google"), and **Join with the invite code** → you should see the first account's tool appear. Request it; approve from the first browser. That round trip proves the shared database works.

## Step 6: Deploy to Firebase Hosting (10 min)

```bash
npm install -g firebase-tools
firebase login
firebase use --add        # pick your toolshare project, alias "default"
npm run build             # produces the static site in out/
firebase deploy           # deploys hosting (out/) AND firestore.rules
```

`firebase.json` in this repo is already configured (`public: "out"`, rules file wired up), so no `firebase init` prompts are needed.

Your app is now live at:

- `https://<your-project-id>.web.app`

**One last required step**: authorize your live domain for login.
Firebase Console → **Authentication → Settings → Authorized domains** → confirm `<your-project-id>.web.app` is listed (it usually is automatically). If you later add a custom domain, add it here too.

### Re-deploying after changes

```bash
npm run build
firebase deploy --only hosting
```

### Alternative: Vercel (if you prefer)

```bash
npm i -g vercel
vercel          # answer prompts; add the six NEXT_PUBLIC_* env vars when asked
vercel --prod
```

Then add your `*.vercel.app` domain to Firebase **Authentication → Settings → Authorized domains**, or Google login will be blocked on the deployed site.

## Step 7: Invite your beta testers (2 min)

Send friends two things:

1. The URL (`https://<your-project-id>.web.app`)
2. Your circle's **invite code** (click the code in the app header to copy it)

They create an account (or use Google), enter the code on the welcome screen, and they're in your circle. Works on iPhone, Android, and desktop browsers — no app store needed. On a phone, "Add to Home Screen" makes it feel like an app.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Offline demo" badge after configuring Firebase | `.env.local` missing/typo'd, or dev server not restarted after editing it. |
| Google popup closes with an error about domain | Add the domain to **Authentication → Settings → Authorized domains**. |
| "This sign-in method isn't enabled" | Enable Email/Password and/or Google in **Authentication → Sign-in method**. |
| "Could not load shared data… check Firestore rules" | Firestore not created (Step 3) or rules not published (`firebase deploy --only firestore:rules`). |
| Created account but circle/join does nothing | Open the browser dev console; almost always a Firestore rules/setup issue. |

## Costs

Firebase free tier: 50K monthly auth users, 1 GiB Firestore storage, 50K reads/20K writes per day, 10 GB hosting transfer/month. A friends-and-family beta won't get near any of these limits. **$0/month.**
