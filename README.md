# KOReader Sync

A self-hosted **progress sync server** and **smart library dashboard** for [KOReader](https://koreader.rocks/) e-reader.

[![Build & Test](https://github.com/your-username/koreader-sync/actions/workflows/build.yml/badge.svg)](https://github.com/your-username/koreader-sync/actions/workflows/build.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **Live preview:** [koreader-sync on GitHub Pages](https://your-username.github.io/koreader-sync/)

---

## Preview

![KOReader Sync Dashboard](docs/preview.png)

The dashboard shows:
- **Library Search** — search your entire ebook library with filters (EPUB, PDF, by cover, by progress)
- **Reading Stats** — active books, completion rate, avg. progress, per-user breakdown, recent activity
- **Book Cards** — cover image, title, author, metadata badges, full-width progress bar

---

## Features

- **KOReader-compatible progress sync** — drop-in replacement for the official sync server
- **Library indexing** — recursive scan of your local ebook directory, MD5-indexed
- **Settings page** — configure library path from the UI, trigger rescans
- **Self-hosted** — your data stays on your machine
- **Dark, distraction-free UI** — inspired by the KOReader aesthetic

---

## Quick Start

### Requirements

- [Node.js 24+](https://nodejs.org/)
- [pnpm 10+](https://pnpm.io/)

### Install & Run

```bash
git clone https://github.com/your-username/koreader-sync.git
cd koreader-sync

# Install dependencies
pnpm install

# Run codegen (required once, and after API spec changes)
pnpm --filter @workspace/api-spec run codegen

# Start both the API server and dashboard
pnpm --filter @workspace/api-server run dev &
pnpm --filter @workspace/koreader-dashboard run dev
```

- Dashboard: http://localhost:3000
- API: http://localhost:8080/api

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | required | Port for the service (set automatically by Replit) |
| `KOREADER_DATA_DIR` | `./koreader-data` | Where progress sync files and settings are stored |
| `KOREADER_CACHE` | `$KOREADER_DATA_DIR/book-md5-cache.json` | Path to the book MD5 cache file |

---

## Data & Backup

### Progress Sync Data Location

All reading progress files are stored in the **data directory** (default: `koreader-data/` in the project root, or set via `KOREADER_DATA_DIR`).

```
koreader-data/
├── settings.json          ← App settings (library path, last scan date)
├── book-md5-cache.json    ← Book MD5 → file path index
├── users/
│   ├── alice/
│   │   ├── auth.json              ← User auth record
│   │   └── [MD5].json             ← One file per book, reading progress
│   └── bob/
│       ├── auth.json
│       └── [MD5].json
└── covers/
    └── [MD5].txt          ← Book cover images (base64 data URLs)
```

The **Settings page** in the dashboard shows you the exact absolute path to each directory.

### Restoring a Backup

To restore reading progress from a previous backup (or migrate from the original Python script):

1. Copy your `auth.json` and `[MD5].json` files into `koreader-data/users/{username}/`
2. Restart the server — it will pick up the files automatically
3. If you have a `book-md5-cache.json`, copy it to `koreader-data/` as well

---

## Configuring KOReader

In KOReader, go to **Tools → Progress sync → Custom sync server**:

| Field | Value |
|---|---|
| Server | `https://your-domain.com/api/koreader` |
| Username | any username (e.g. your name) |
| Password | anything (not validated) |

---

## Library Setup

1. Open the **Settings** page in the dashboard
2. Enter the absolute path to your ebook library root (e.g. `/home/user/Books`)
3. Click **Scan Library**
4. The server recursively walks the directory, computes MD5 hashes for all ebooks, and indexes them
5. Library search in the dashboard will now return real results

Supported formats: `epub`, `pdf`, `mobi`, `azw`, `azw3`, `cbz`, `cbr`, `djvu`, `fb2`, `txt`

---

## Versioning

This project uses [Semantic Versioning](https://semver.org/). See [CHANGELOG.md](CHANGELOG.md) for release history.

To create a new release:

```bash
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

GitHub Actions will automatically create a GitHub Release with the changelog excerpt and compiled build artifacts.

---

## Development

```bash
# Full typecheck
pnpm run typecheck

# Rebuild API server
pnpm --filter @workspace/api-server run build

# Regenerate API hooks (after openapi.yaml changes)
pnpm --filter @workspace/api-spec run codegen

# Push DB schema (if using Drizzle)
pnpm --filter @workspace/db run push
```

---

## License

MIT
