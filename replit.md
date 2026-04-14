# KOReader Smart Library + Progress Sync

## Overview

A self-hosted web app for KOReader users with:
1. **Progress Sync API** — KOReader-compatible sync endpoint
2. **Dashboard** — Reading stats, recent activity, per-user breakdown
3. **Library Search** — Search ebooks by title/filename with filters
4. **Settings** — Configure local library path, trigger rescans, view data locations
5. **Windows Deployment** — Single PowerShell script installs and auto-updates as a Windows service

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Frontend**: React + Vite + Tailwind CSS + Wouter routing
- **Validation**: Zod (`zod/v4`), Orval codegen from OpenAPI spec
- **Build**: esbuild (bundled ESM for API), Vite (for dashboard)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/koreader-dashboard run dev` — run frontend locally

## Artifacts

- `artifacts/api-server` — Express API server (serves API at `/api` + dashboard static files)
- `artifacts/koreader-dashboard` — React+Vite dashboard (dev only; bundled into API dist for release)

## Release Process

Releases are **fully automatic** on every push to `main`:
1. Version is computed as `v{package.json version}.{CI run number}` (e.g. `v1.2.42`)
2. Dashboard is built with `BASE_PATH=/` so Express can serve it
3. Dashboard static files are copied into `artifacts/api-server/dist/public/`
4. API server is built — Express serves both API and dashboard from one process
5. Bundle is zipped as `koreader-sync-server-{version}.zip`
6. A Git tag is created automatically
7. A GitHub Release is created with two assets:
   - `koreader-sync.ps1` — the Windows deployment script
   - `koreader-sync-server-{version}.zip` — the server bundle

## Windows Deployment Script (`koreader-sync.ps1`)

Single PowerShell script at the repo root. Users download it once and run it.

- **Fresh install**: downloads NSSM + latest server zip, installs Windows service `KOReaderSync`
- **Update**: detects installed version, stops service, downloads new bundle, restarts
- **Uninstall**: `.\koreader-sync.ps1 -Uninstall`
- All files stored in `$PSScriptRoot`: `app\`, `data\`, `logs\`, `nssm.exe`, `.installed-version`

## API Endpoints

### Dashboard
- `GET /api/healthz` — health check
- `GET /api/koreader/stats` — aggregate reading stats
- `GET /api/koreader/search?q=...&ext=epub&cover=1&recent=1` — library search
- `GET /api/koreader/cover/:md5` — book cover image (SVG placeholder if missing)

### KOReader Progress Sync
- `GET /api/koreader/syncs/:username/:document` — retrieve reading progress
- `PUT /api/koreader/syncs/:username/:document` — save reading progress
- `GET /api/koreader/users/:username/auth` — user auth (auto-creates users)

### Settings
- `GET /api/koreader/settings` — get current settings and data directory paths
- `PUT /api/koreader/settings` — update library path
- `POST /api/koreader/settings/scan` — trigger recursive library scan
- `GET /api/koreader/settings/scan/status` — get scan progress

## Data Storage

Progress data is stored as JSON files under `koreader-data/` (configurable via `KOREADER_DATA_DIR`):
```
koreader-data/
├── settings.json
├── book-md5-cache.json
├── users/
│   └── {username}/
│       ├── auth.json
│       └── [MD5].json
└── covers/
    └── [MD5].txt
```

## Production Bundle Layout

When installed via `koreader-sync.ps1` on Windows:
```
<install dir>\
├── koreader-sync.ps1
├── nssm.exe
├── .installed-version
├── app\
│   ├── index.mjs        ← API server + dashboard (one process)
│   ├── pino-*.mjs
│   └── public\          ← dashboard static files served by Express
├── data\                ← progress sync data (back up this folder)
└── logs\
```

## GitHub CI

- `.github/workflows/build.yml` — auto-release on push to main, GitHub Pages deploy
- `.github/workflows/release.yml` — deprecated no-op (kept to avoid broken links)
