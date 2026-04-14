# KOReader Sync

A self-hosted **progress sync server** and **smart library dashboard** for [KOReader](https://koreader.rocks/) e-reader.

[![Build & Release](https://github.com/your-username/koreader-sync/actions/workflows/build.yml/badge.svg)](https://github.com/your-username/koreader-sync/actions/workflows/build.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **Dashboard preview:** [koreader-sync on GitHub Pages](https://your-username.github.io/koreader-sync/)

---

## Features

- **KOReader-compatible progress sync** — drop-in replacement for the official sync server
- **Smart library dashboard** — reading stats, book cards, progress bars, recent activity
- **Library indexing** — recursive scan of your local ebook directory, MD5-indexed
- **Settings page** — configure library path from the browser UI, trigger rescans
- **One-step Windows deployment** — a single PowerShell script installs and auto-updates
- **Self-hosted** — your data stays on your machine

---

## Windows Server Deployment (Recommended)

### Requirements

- Windows Server 2016 or later (or Windows 10/11)
- [Node.js 20+](https://nodejs.org/en/download/) installed
- PowerShell 5.1 or PowerShell 7+ (both work)
- Administrator rights (needed to create a Windows service)

### Install

1. Go to the [Releases page](https://github.com/your-username/koreader-sync/releases/latest)
2. Download `koreader-sync.ps1`
3. Place it in the folder where you want the server to live (e.g. `C:\KOReaderSync\`)
4. Open PowerShell **as Administrator** in that folder
5. Run:

```powershell
.\koreader-sync.ps1
```

The script will:
- Check that Node.js is installed
- Download NSSM (Windows service manager) automatically
- Download the latest server bundle from GitHub
- Install and start a Windows service called `KOReaderSync`
- Print the URL to open the dashboard

All files (server, data, logs) are stored in the folder where you ran the script.

### Custom port

```powershell
.\koreader-sync.ps1 -Port 8080
```

### Update

Run the same script again. It detects the installed version, downloads the latest release, and restarts the service automatically:

```powershell
.\koreader-sync.ps1
```

### Uninstall

```powershell
.\koreader-sync.ps1 -Uninstall
```

This removes the Windows service. Your data directory is left intact.

---

## Configuring KOReader

After installation, configure KOReader to sync to your server:

**Tools → Progress sync → Custom sync server**

| Field | Value |
|---|---|
| Server | `http://<your-server-ip>:<port>/api/koreader` |
| Username | any username (e.g. your name) |
| Password | anything (not validated) |

---

## Library Setup

1. Open the **Settings** page in the dashboard (Settings button, top-right)
2. Enter the absolute path to your ebook library root (e.g. `C:\Books`)
3. Click **Scan Library**
4. The server recursively walks the directory, computes MD5 hashes for all ebooks, and indexes them
5. Library search in the dashboard will now return real results with covers

Supported formats: `epub`, `pdf`, `mobi`, `azw`, `azw3`, `cbz`, `cbr`, `djvu`, `fb2`, `txt`

---

## Data & Backup

All reading progress is stored as plain JSON files in the `data\` folder next to the script:

```
data\
├── settings.json          ← Library path and last scan date
├── book-md5-cache.json    ← Book MD5 → file path index
├── users\
│   ├── alice\
│   │   ├── auth.json              ← User record
│   │   └── [MD5].json             ← One file per book (reading progress)
│   └── bob\
│       ├── auth.json
│       └── [MD5].json
└── covers\
    └── [MD5].txt          ← Cover images (base64 data URLs)
```

The **Settings page** shows the exact path to each directory and flags which folder to back up.

To restore: copy `auth.json` and `[MD5].json` files into `data\users\{username}\` and restart the service.

---

## File Layout After Installation

```
C:\KOReaderSync\            ← folder where you placed the .ps1
├── koreader-sync.ps1       ← deployment script
├── nssm.exe                ← service manager (auto-downloaded)
├── .installed-version      ← tracks which version is installed
├── app\                    ← server files
│   ├── index.mjs           ← API server (Node.js, fully bundled)
│   ├── pino-*.mjs          ← logging workers
│   └── public\             ← dashboard static files
│       ├── index.html
│       └── assets\
├── data\                   ← reading progress and settings (back this up)
└── logs\                   ← server log files
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `7300` | Port for the server |
| `KOREADER_DATA_DIR` | `.\data` (next to script) | Where progress sync files are stored |

These are set automatically by the deployment script. You can change them in the NSSM service configuration if needed.

---

## Versioning & Releases

Releases are created **automatically** on every push to the `main` branch. No manual tagging or publishing steps are required.

Version format: `v{major}.{minor}.{CI run number}` — for example `v1.1.42`.

To bump the minor/major version, update `"version"` in `package.json` and push. Every subsequent push increments the patch automatically.

See [CHANGELOG.md](CHANGELOG.md) for release history.

---

## Development

### Requirements

- [Node.js 24+](https://nodejs.org/)
- [pnpm 10+](https://pnpm.io/)

### Run locally

```bash
git clone https://github.com/your-username/koreader-sync.git
cd koreader-sync
pnpm install
pnpm --filter @workspace/api-spec run codegen

# Start API server (port 8080 by default in dev)
pnpm --filter @workspace/api-server run dev &

# Start dashboard (port 3000)
pnpm --filter @workspace/koreader-dashboard run dev
```

### Other commands

```bash
# Full typecheck
pnpm run typecheck

# Rebuild API server
pnpm --filter @workspace/api-server run build

# Regenerate API client hooks (after openapi.yaml changes)
pnpm --filter @workspace/api-spec run codegen
```

---

## License

MIT
