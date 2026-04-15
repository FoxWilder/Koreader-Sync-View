# KOReader Sync

A self-hosted **progress sync server** and **smart library dashboard** for [KOReader](https://koreader.rocks/).

[![Build & Release](https://github.com/FoxWilder/Koreader-Sync-View/actions/workflows/build.yml/badge.svg)](https://github.com/FoxWilder/Koreader-Sync-View/actions/workflows/build.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **Live preview:** [foxwilder.github.io/Koreader-Sync-View](https://foxwilder.github.io/Koreader-Sync-View/)

<img width="1872" height="970" alt="image" src="https://github.com/user-attachments/assets/d5151fe0-8218-4bce-a358-2b22d87307d5" />

---

## The Story Behind KOReader Sync

Like many families, ours is full of passionate readers. We have Kindles scattered around the house and a trusty XTEINK X4 that travels everywhere with us. The one thing that always frustrated us was losing reading progress whenever someone switched devices or—worse—when a device broke and had to be replaced. We wanted a simple way to keep everyone’s place in every book, no matter which screen they picked up.

So I built a small script that ran on my old Windows server. It turned the server into a private progress-sync hub: each family member got their own account, their reading data was safely backed up, and switching devices became effortless—you could pick up exactly where you left off.

As the months went by and we read more books than ever, I started wondering what all that data could tell us. That curiosity turned into a full web dashboard: beautiful reading stats, progress bars, recent activity, and a visual heatmap of our reading streaks. To make it truly useful, I hosted our entire ebook library on the same server and built a database that matched KOReader’s filename-hash system. Suddenly we could see, for every user, exactly which book they were reading, how far they’d gotten, plus rich details like title, author, series, and cover art.

I realized other KOReader users and book-loving families might want the same thing. That’s why I open-sourced the project and turned it into the easy, one-click tool you see today.

**KOReader Sync** is deliberately simple to run:  
- A single PowerShell script does *everything*—no manual downloads, no complex setup.  
- It creates a proper Windows service that starts automatically after reboots.  
- Upgrading to a newer version is just a matter of running the script again; your users, progress, and settings are preserved.  
- The built-in web settings page lets you point the server at your own ebook library (it scans recursively), configure KOReader sync details, and change the port (defaults to 7300).  
- There’s even a one-command uninstall if you ever need it.

Everything stays on your machine. Your books, your progress, your data—completely private and under your control.

---

### ❤️ Support This Project

I'm a solo developer building this tool in my free time after many late-night vibe-coding sessions. If **Koreader-Sync-View** makes your reading life better, consider becoming a sponsor. Every contribution helps me dedicate more time to new features, better multi-platform support, Docker images, and community requests.

**[Become a Sponsor ❤️](https://github.com/sponsors/FoxWilder)**

---

## Features

- **KOReader-compatible sync API** — drop-in replacement for the official sync server
- **Smart library dashboard** — reading stats, book cards with covers, progress bars, recent activity
- **EPUB metadata** — title, author, series, description, publisher, language extracted automatically
- **Book covers** — extracted from EPUB files during scan, no external service needed
- **Library indexing** — recursive scan with MD5 hashing (filename-based, matching KOReader's scheme)
- **Rebuild cache** — wipe and regenerate the index from scratch when needed
- **Activity heatmap** — visualise your reading streaks over the last 16 weeks
- **Book detail modal** — click any book card for full metadata, cover, and progress history
- **Settings page** — configure library path, trigger scans, view data directory layout
- **One-step Windows deployment** — a single PowerShell script installs and auto-updates via Windows service
- **Self-hosted** — your data stays on your machine

---

## Windows Server Deployment (Recommended)

### Requirements

- Windows Server 2016+ or Windows 10/11
- [Node.js 20+](https://nodejs.org/en/download/)
- PowerShell 5.1 or 7+
- Administrator rights (required to create a Windows service)

### Install

1. Go to the [Releases page](https://github.com/FoxWilder/Koreader-Sync-View/releases/latest)
2. Download `koreader-sync.ps1`
3. Place it in the folder where you want the server to live (e.g. `C:\KOReaderSync\`)
4. Open PowerShell **as Administrator** in that folder
5. Run:

```powershell
.\koreader-sync.ps1
```

The script will:
- Verify Node.js is installed
- Download NSSM (Windows service manager) automatically
- Download the latest server bundle from GitHub
- Install and start a Windows service called `KOReaderSync`
- Print the dashboard URL

All files (server, data, logs) are stored in the folder where you ran the script.

If you get an error like this:
```powershell
.\koreader-sync.ps1 : File \koreader-sync.ps1 cannot be loaded. The file \koreader-sync.ps1 is not digitally signed. You cannot run this script on the current system.
```
The easiest way to get it to run is by executing it like this:
```powershell
pwsh -ExecutionPolicy Bypass -File .\koreader-sync.ps1
```

### Custom port

```powershell
.\koreader-sync.ps1 -Port 8080
```

### Update

Run the same script again — it detects the installed version, downloads the latest release, and restarts the service:

```powershell
.\koreader-sync.ps1
```

### Uninstall

```powershell
.\koreader-sync.ps1 -Uninstall
```

Removes the Windows service. Your data directory is left intact.

---

## Configuring KOReader

After installation, point KOReader at your server:

**Tools → Progress sync → Custom sync server**

| Field | Value |
|---|---|
| Server | `http://<your-server-ip>:<port>/api/koreader` |
| Username | any (e.g. your name) |
| Password | anything (not validated) |

---

## Library Setup

1. Open the **Settings** page (bottom-left button on the dashboard)
2. Enter the absolute path to your ebook library root (e.g. `C:\Books`)
3. Click **Scan Library** to index new books, or **Rebuild Cache** to start fresh
4. The server walks the directory recursively, hashes filenames (matching KOReader's scheme), and extracts covers and metadata from all EPUBs in the background

Supported formats: `epub`, `pdf`, `mobi`, `azw`, `azw3`, `cbz`, `cbr`, `djvu`, `fb2`, `txt`

> **Note:** Use **Rebuild Cache** after the first install or whenever you rename files, to regenerate the index from scratch.

---

## Data & Backup

All data is stored as plain files in the `data\` folder next to the script:

```
data\
├── settings.json          ← library path and last scan date
├── book-md5-cache.json    ← MD5(filename) → file path index
├── users\
│   ├── alice\
│   │   ├── auth.json              ← user record
│   │   └── [MD5].json             ← reading progress per book
│   └── bob\
│       └── ...
├── covers\
│   └── [MD5].txt          ← cover images (base64 data URLs)
└── meta\
    └── [MD5].json         ← EPUB metadata (title, author, series, etc.)
```

To back up: copy the entire `data\users\` folder. To restore: copy `auth.json` and `[MD5].json` files into `data\users\{username}\` and restart the service.

The **Settings page** shows the exact path to each directory.

---

## File Layout After Installation

```
C:\KOReaderSync\
├── koreader-sync.ps1       ← deployment script
├── nssm.exe                ← service manager (auto-downloaded)
├── .installed-version      ← tracks installed version
├── app\
│   ├── index.mjs           ← API + dashboard server (Node.js, fully bundled)
│   ├── pino-*.mjs          ← logging workers
│   └── public\             ← dashboard static files
├── data\                   ← reading progress, covers, metadata (back this up)
└── logs\                   ← server log files
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `7300` | Port the server listens on |
| `KOREADER_DATA_DIR` | `.\data` | Where all sync data is stored |

Set automatically by the deployment script. Change via NSSM service configuration if needed.

---

## Versioning & Releases

Releases are created **automatically** on every push to `main`. No manual tagging required.

Version format: `v{major}.{minor}.{CI run number}` — e.g. `v1.3.57`.

To bump the version, update `"version"` in `package.json` and push.

See [CHANGELOG.md](CHANGELOG.md) for release history.

---

## Development

### Requirements

- [Node.js 24+](https://nodejs.org/)
- [pnpm 10+](https://pnpm.io/)

### Run locally

```bash
git clone https://github.com/FoxWilder/Koreader-Sync-View.git
cd Koreader-Sync-View
pnpm install
pnpm --filter @workspace/api-spec run codegen

# Start API server
pnpm --filter @workspace/api-server run dev &

# Start dashboard
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/koreader-dashboard run dev
```

### Commands

```bash
pnpm run typecheck                          # full typecheck
pnpm --filter @workspace/api-spec run codegen  # regenerate API client
pnpm run build                              # build everything
```

### Project structure

```
artifacts/
├── api-server/             ← Express API + static file server
│   └── src/lib/
│       ├── koreader-store.ts    ← in-memory state, book cards
│       └── koreader-settings.ts ← scan, cover/meta extraction
├── koreader-dashboard/     ← React + Vite + Tailwind dashboard
│   └── src/components/
│       ├── BookCard.tsx
│       ├── BookDetailModal.tsx
│       ├── DashboardStats.tsx
│       └── LibrarySearch.tsx
lib/
├── api-spec/openapi.yaml   ← OpenAPI spec (source of truth)
├── api-zod/                ← generated Zod validators
└── api-client-react/       ← generated React Query hooks
```

---

## Sponsors
A big thank you to everyone supporting the project!

Special Thanks

All current and future sponsors ❤️

---

## License

MIT
