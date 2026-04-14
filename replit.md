# KOReader Smart Library + Progress Sync

## Overview

A self-hosted web app for KOReader users with:
1. **Progress Sync API** — KOReader-compatible sync endpoint
2. **Dashboard** — Reading stats, recent activity, per-user breakdown
3. **Library Search** — Search ebooks by title/filename with filters
4. **Settings** — Configure local library path, trigger rescans, view data locations
5. **GitHub CI** — Auto-build, versioning, release notes, GitHub Pages preview

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Frontend**: React + Vite + Tailwind CSS + Wouter routing
- **Validation**: Zod (`zod/v4`), Orval codegen from OpenAPI spec
- **Build**: esbuild (CJS bundle for API), Vite (for frontend)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/koreader-dashboard run dev` — run frontend locally

## Artifacts

- `artifacts/api-server` — Express API server (port assigned by Replit, at `/api`)
- `artifacts/koreader-dashboard` — React+Vite dashboard (at `/`)

## API Endpoints

### Dashboard
- `GET /api/healthz` — health check
- `GET /api/koreader/stats` — aggregate reading stats (auto-refreshed every 3s)
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

Progress data is stored as JSON files under `koreader-data/` (next to the running API server binary):
```
koreader-data/
├── settings.json          ← App settings (library path, last scan date)
├── book-md5-cache.json    ← Book MD5 → file path index
├── users/
│   ├── {username}/
│   │   ├── auth.json              ← User auth record
│   │   └── [MD5].json             ← Reading progress per book
│   └── ...
└── covers/
    └── [MD5].txt          ← Book cover images (base64 data URLs)
```

Set `KOREADER_DATA_DIR` env var to override the data directory path.
Set `KOREADER_CACHE` env var to override the cache file path.

## GitHub Setup

- `.github/workflows/build.yml` — CI: build + typecheck on every push, deploy GitHub Pages preview on main
- `.github/workflows/release.yml` — Release: auto GitHub Release with changelog on version tags
- `README.md` — full setup guide, KOReader config, backup/restore instructions
- `CHANGELOG.md` — Keep a Changelog format

To release a new version:
```bash
git tag -a v1.1.0 -m "Release v1.1.0"
git push origin v1.1.0
```

## KOReader Configuration

In KOReader: Tools → Progress sync → Custom sync server
- Server: `https://your-domain.replit.app/api/koreader`
- Username: any username
- Password: anything (not validated)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
