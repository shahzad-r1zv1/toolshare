# Deployment Guide for ToolShare

This guide covers hosting options for ToolShare with focus on **minimal cost** for early beta testing.

## Overview

ToolShare is built as:
1. **Static web app** (Next.js static export) - no server-side rendering
2. **Android APK** (Capacitor wrapper around the web app)

Both can be deployed independently or together.

---

## 🏆 Recommended: Firebase Hosting (FREE)

**Best for**: Early beta testing, minimal cost, zero configuration

### Why Firebase Hosting?

- ✅ **Free tier**: 10 GB storage, 360 MB/day transfer, custom domain included
- ✅ **Automatic HTTPS**: SSL certificates managed for you
- ✅ **CDN included**: Fast global content delivery
- ✅ **Already using Firebase**: No additional service setup
- ✅ **Estimated cost**: $0/month for early beta with friends

### Setup Steps

1. **Install Firebase CLI**:
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **Initialize Firebase Hosting**:
   ```bash
   firebase init hosting
   ```

   Configuration prompts:
   - Use an existing project: Select your Firebase project
   - Public directory: `out`
   - Configure as single-page app: `Yes`
   - Set up automatic builds with GitHub: `No` (or `Yes` for CI/CD)
   - Overwrite `out/index.html`: `No`

3. **Build and deploy**:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

4. **Your app is live at**:
   - `https://your-project.web.app`
   - `https://your-project.firebaseapp.com`

### Custom Domain (Optional)

1. In Firebase Console: **Hosting** → **Add custom domain**
2. Enter your domain (e.g., `toolshare.yourdomain.com`)
3. Add DNS records as instructed (typically `A` and `TXT` records)
4. Firebase handles SSL certificate provisioning automatically

### Automatic Deployment with GitHub Actions

Create `.github/workflows/deploy-web.yml`:

```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.NEXT_PUBLIC_FIREBASE_API_KEY }}
          NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN }}
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}
          NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: ${{ secrets.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET }}
          NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID }}
          NEXT_PUBLIC_FIREBASE_APP_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_APP_ID }}

      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          projectId: your-project-id
```

**Setup**:
1. Generate Firebase service account:
   ```bash
   firebase init hosting:github
   ```
2. Add Firebase env vars to GitHub Secrets (Settings → Secrets → Actions)

---

## Alternative 1: Vercel (FREE)

**Best for**: Next.js-optimized hosting, instant deployments

### Why Vercel?

- ✅ **Free tier**: 100 GB bandwidth/month
- ✅ **Zero config**: Built for Next.js
- ✅ **Automatic previews**: Every git push gets a preview URL
- ✅ **Estimated cost**: $0/month for hobby projects

### Setup Steps

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy**:
   ```bash
   npm run build
   vercel --prod
   ```

3. **Or connect GitHub repo**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel auto-detects Next.js and deploys
   - Add Firebase env vars in Vercel dashboard

4. **Your app is live at**: `https://your-project.vercel.app`

---

## Alternative 2: Netlify (FREE)

**Best for**: Static sites, easy drag-and-drop deployment

### Why Netlify?

- ✅ **Free tier**: 100 GB bandwidth/month
- ✅ **Simple**: Drag-and-drop deployment
- ✅ **Forms & functions**: Extra features if needed
- ✅ **Estimated cost**: $0/month for starter plan

### Setup Steps

1. **Build locally**:
   ```bash
   npm run build
   ```

2. **Deploy via Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   netlify login
   netlify deploy --prod --dir=out
   ```

3. **Or drag-and-drop**:
   - Go to [netlify.com](https://netlify.com)
   - Drag `out/` folder to deploy
   - Configure env vars in Netlify dashboard

4. **Your app is live at**: `https://your-project.netlify.app`

---

## Alternative 3: GitHub Pages (FREE)

**Best for**: Open-source projects, simple hosting

### Why GitHub Pages?

- ✅ **Completely free**: No bandwidth limits for public repos
- ✅ **Simple setup**: Deploy from GitHub Actions
- ✅ **Custom domain**: Supported
- ✅ **Estimated cost**: $0/month

### Setup Steps

1. **Create `.github/workflows/deploy-pages.yml`**:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.NEXT_PUBLIC_FIREBASE_API_KEY }}
          NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN }}
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}
          NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: ${{ secrets.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET }}
          NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID }}
          NEXT_PUBLIC_FIREBASE_APP_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_APP_ID }}

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./out

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

2. **Enable GitHub Pages**:
   - Go to repository **Settings** → **Pages**
   - Source: **GitHub Actions**
   - Save

3. **Add Firebase env vars** to GitHub Secrets

4. **Your app is live at**: `https://yourusername.github.io/toolshare`

**Note**: Update `basePath` in `next.config.ts` if using a repo name:
```typescript
const nextConfig = {
  output: "export",
  basePath: process.env.NODE_ENV === 'production' ? '/toolshare' : '',
};
```

---

## Android APK Distribution

For distributing the Android APK to beta testers, see [BETA_TESTING.md](./BETA_TESTING.md).

Options include:
- Google Play Internal Testing (free, managed)
- Direct APK distribution (manual, requires "unknown sources")
- Firebase App Distribution (recommended for beta testing)

---

## Cost Comparison Summary

| Platform | Free Tier | Bandwidth | Storage | Estimated Beta Cost |
|----------|-----------|-----------|---------|---------------------|
| **Firebase Hosting** | ✅ | 360 MB/day | 10 GB | **$0/month** |
| **Vercel** | ✅ | 100 GB/month | Unlimited | **$0/month** |
| **Netlify** | ✅ | 100 GB/month | Unlimited | **$0/month** |
| **GitHub Pages** | ✅ | Soft limits | 1 GB | **$0/month** |

**Recommendation for early beta**: **Firebase Hosting**
- Already using Firebase for auth
- Simplest to set up
- Sufficient for 10-100 users
- Easy to scale if needed

---

## Scaling Considerations

### When you might exceed free tiers:

**Firebase Hosting**:
- 360 MB/day ≈ 10.8 GB/month
- ~10,000 page loads/month (assuming ~1 MB per load)
- **Paid tier**: $0.15/GB after free tier

**Vercel**:
- 100 GB/month bandwidth
- ~100,000 page loads/month
- **Paid tier**: $20/month (Pro plan)

**For 50-100 beta testers**: All platforms remain free
**For 1,000+ active users**: Consider Firebase Hosting + Vercel ($0-20/month total)

---

## Next Steps

1. Choose a hosting platform (recommended: **Firebase Hosting**)
2. Set up deployment following the steps above
3. Configure Firebase Authentication (see [FIREBASE_SETUP.md](./FIREBASE_SETUP.md))
4. Distribute to beta testers (see [BETA_TESTING.md](./BETA_TESTING.md))
