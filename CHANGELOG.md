# Changelog

All notable changes to KOReader Sync will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Added
- Nothing yet

---

## [1.2] - 2026-04-14

### Changed
- **Releases are now fully automatic** — every push to `main` creates a GitHub Release.
  No manual tagging or publish step required. Version = `{major}.{minor}.{CI run number}`.
- **Single PowerShell deployment script** (`koreader-sync.ps1`) replaces separate server and
  dashboard tarballs as the primary release artifact
- **Unified service** — Express now serves the dashboard as static files alongside the API,
  so only one Node.js process is needed (one port, one service)
- **Windows service management** — script auto-downloads NSSM, creates and starts
  `KOReaderSync` as a Windows service on first run
- **Auto-update** — running the script again detects the installed version and applies
  updates by stopping the service, replacing files, and restarting
- **Uninstall flag** — `.\koreader-sync.ps1 -Uninstall` cleanly removes the service

### Removed
- Separate `release.yml` workflow (merged into `build.yml`)
- Manual `git tag` / `git push origin v*` release flow

---

## [1.1] - 2026-04-14

### Added
- **Settings page** — configure local ebook library path from the UI
- **Library scanner** — recursive MD5 indexing of local ebook directory (epub, pdf, mobi, azw3, cbz, djvu, fb2 and more)
- **Scan progress indicator** — real-time scan status with file count and current file
- **Data directory help** — settings page shows exact paths for progress sync backup/restore
- **GitHub Actions** — CI build + typecheck on every push
- **GitHub Pages preview** — dashboard static build deployed to GitHub Pages on main branch merges
- **README** — full setup guide, KOReader configuration, backup/restore instructions
- **CHANGELOG** — this file

---

## [1.0] - 2026-04-14

### Added
- **KOReader progress sync API** — compatible with KOReader's built-in sync protocol
  - `GET /api/koreader/syncs/:username/:document` — retrieve reading progress
  - `PUT /api/koreader/syncs/:username/:document` — save reading progress
  - `GET /api/koreader/users/:username/auth` — user authentication (auto-creates users)
- **Reading stats dashboard** — aggregate KPIs, recent activity, per-user breakdown
- **Library search** — search by title/filename with filters (EPUB, PDF, with cover, has progress)
- **Book covers** — served from base64 data URL cache, SVG placeholder fallback
- **Auto-refresh** — stats update every 4 seconds
- **Dark UI** — deep space aesthetic inspired by KOReader

[Unreleased]: https://github.com/your-username/koreader-sync/compare/v1.2...HEAD
[1.2]: https://github.com/your-username/koreader-sync/compare/v1.1...v1.2
[1.1]: https://github.com/your-username/koreader-sync/compare/v1.0...v1.1
[1.0]: https://github.com/your-username/koreader-sync/releases/tag/v1.0
