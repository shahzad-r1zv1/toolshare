# Search-rank worker

Proxies free-text search relevance scoring to TypeSafe's SystemOne API for
the tool-share app's search boxes. It exists only to keep the TypeSafe API
key off the client — the app itself is a static export with no server of
its own.

Uses Cloudflare Workers' free tier (no billing account required).

## Deploy

```
cd worker
npm install
npx wrangler login
npx wrangler secret put TYPESAFE_API_KEY
npx wrangler deploy
```

Optionally restrict CORS to your deployed origin instead of `*`:

```
npx wrangler secret put ALLOWED_ORIGIN
# e.g. https://your-project.web.app
```

`wrangler deploy` prints the worker's URL (something like
`https://toolshare-search-rank.<your-subdomain>.workers.dev`). Put it in the
app's `.env.local` as:

```
NEXT_PUBLIC_SEARCH_RANK_URL=https://toolshare-search-rank.<your-subdomain>.workers.dev
```

If this variable is left unset, the app's search falls back to plain
substring matching — nothing breaks, it just won't catch synonyms or rank
by relevance.
