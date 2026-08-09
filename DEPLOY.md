# Deploying Offline Arcade

Offline Arcade is a React + Vite SPA served by a small Node server (`server.cjs`).
It can run on any Node host. This repo ships configs for Render and Railway.

## How it runs

- **Build**: `npm install --include=dev && npm run build`
  - **Node 22+ is required** (`engines` in `package.json` + `.nvmrc`). Vite 8 /
    rolldown and the Firebase SDK need `>=22.12.0`; Nixpacks and Render both read
    `engines`/`.nvmrc` to select the runtime, so they no longer default to Node 18.
  - `--include=dev` is required: Render sets `NODE_ENV=production`, which makes a
    plain `npm install` skip devDependencies, and Vite is a devDependency.
  - The build runs `vite build`, then `node scripts/generate-seo.mjs`, which writes
    the 29 per-game pages into `dist/play/<id>/index.html` plus `sitemap.xml` and
    `robots.txt`. SEO URLs come from the `SITE_URL` env var (defaults to
    `https://offline-arcade.onrender.com`).
- **Start**: `npm start` runs `node server.cjs`.
  - Listens on `process.env.PORT || 3000` (Render and Railway inject `PORT`).
  - Serves `dist/` statically with SPA fallback for the app routes and `/play/*`.
  - `GET /health` returns 200 for platform healthchecks.
- **Firebase**: config is baked into the client (`src/firebase.js`); there are no
  server-side secrets to set. Firestore rules deploy separately via
  `firebase deploy --only firestore:rules --project offline-arcade-468cd`.

## Environment variables

| Variable | Purpose | Example |
| --- | --- | --- |
| `NODE_ENV` | `production` at runtime | `production` |
| `ELECTRON_SKIP_BINARY_DOWNLOAD` | skip Electron's ~100 MB download during install (never used on the server) | `1` |
| `SITE_URL` | origin used for per-game SEO pages, canonical/OG URLs, sitemap | `https://offline-arcade.onrender.com` |

## Render

Deploy via the blueprint (`render.yaml`) or the dashboard.

1. In the Render dashboard: **New > Web Service**, connect the GitHub repo.
2. Build command: `npm install --include=dev && npm run build`
3. Start command: `npm start`
4. Env vars: `NODE_ENV=production`, `ELECTRON_SKIP_BINARY_DOWNLOAD=1`, and
   `SITE_URL=https://<your-service>.onrender.com`.
5. The service is automatically healthchecked on `/health`.

`render.yaml` (service name `offline-arcade`, root URL
`https://offline-arcade.onrender.com`) has all of this, so a push to `main` also
auto-redeploys if you use the blueprint.

## Railway

Deploy via `railway.json` (auto-detected) or the CLI.

1. Install the CLI and log in:
   ```bash
   npm i -g @railway/cli
   railway login
   ```
2. From the repo root:
   ```bash
   railway init
   railway up
   ```
   Railway builds from `railway.json`: Nixpacks, build
   `npm install --include=dev && npm run build`, start `npm start`, healthcheck on `/health`.
3. In the Railway dashboard set `SITE_URL=https://<your-app>.up.railway.app`
   (and optionally `ELECTRON_SKIP_BINARY_DOWNLOAD=1`).

## Post-deploy checks

```bash
curl -sI https://<your-domain>/health   # HTTP 200 "ok"
curl -sI https://<your-domain>/play/snake  # HTTP 200, serves the SPA
curl -sI https://<your-domain>/            # HTTP 200
curl -sI https://<your-domain>/does-not-exist  # HTTP 404 (real 404, not SPA fallback)
```

Open `/play/snake` in a browser and confirm it renders. Deep links
(`/play/<id>`, `/leagues`, `/about-us`, ...) must reload correctly, not 404.

## Notes

- The SPA uses hash-free routes; only paths in `VALID_ROUTES` or `/play/<id>` get
  the SPA fallback. Everything else returns a real 404.
- PWA service worker (`sw.js`) caches under `arcade-v3`; bump the cache name when
  deploying breaking asset changes.
- Firestore rules are in `firestore.rules`; after any change, redeploy from a
  fresh clone: `cd OfflineArcade && git pull && firebase deploy --only firestore:rules --project offline-arcade-468cd`.
