# KOReader Smart Library + Progress Sync

## Overview

A web-based dashboard for KOReader users with:
1. **Progress Sync API** — KOReader-compatible sync endpoint at `/api/koreader/syncs/:username/:document`
2. **Dashboard Web UI** — Reading stats, recent activity, and library search at `/`

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Frontend**: React + Vite + Tailwind CSS
- **Validation**: Zod (`zod/v4`), Orval codegen
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

- `GET /api/healthz` — health check
- `GET /api/koreader/stats` — aggregate reading stats (auto-refreshed every 3s)
- `GET /api/koreader/search?q=...&ext=epub&cover=1&recent=1` — library search
- `GET /api/koreader/cover/:md5` — book cover image (SVG placeholder if missing)
- `GET /api/koreader/syncs/:username/:document` — get reading progress (KOReader sync)
- `PUT /api/koreader/syncs/:username/:document` — update reading progress (KOReader sync)
- `GET /api/koreader/users/:username/auth` — authenticate user

## Data Storage

Progress data is stored as JSON files under `koreader-data/`:
- `koreader-data/users/{username}/{document}.json` — reading progress per user+document
- `koreader-data/covers/{md5}.txt` — base64 data URLs for book covers
- `koreader-data/book-md5-cache.json` — optional: maps MD5 hashes to file paths for library search

Set `KOREADER_DATA_DIR` env var to override the data directory path.
Set `KOREADER_CACHE` env var to override the cache file path.

## KOReader Configuration

In KOReader, configure the sync server to:
- Server: `https://your-replit-domain.replit.app/api/koreader`
- Username: any username
- Password: (not enforced, any value works)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
