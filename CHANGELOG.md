# Changelog

All notable changes to KOReader Sync will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Nothing yet

---

## [1.1.0] - 2026-04-14

### Added
- **Settings page** — configure local ebook library path from the UI
- **Library scanner** — recursive MD5 indexing of local ebook directory (epub, pdf, mobi, azw3, cbz, djvu, fb2 and more)
- **Scan progress indicator** — real-time scan status with file count and current file
- **Data directory help** — settings page shows exact paths for progress sync backup/restore
- **GitHub Actions** — CI build + typecheck on every push
- **GitHub Pages preview** — dashboard static build deployed to GitHub Pages on main branch merges
- **Release workflow** — automated GitHub Releases with changelog excerpt on version tags
- **README** — full setup guide, KOReader configuration, backup/restore instructions
- **CHANGELOG** — this file

---

## [1.0.0] - 2026-04-14

### Added
- Initial release
- **KOReader progress sync API** — compatible with KOReader's built-in sync protocol
  - `GET /api/koreader/syncs/:username/:document` — retrieve reading progress
  - `PUT /api/koreader/syncs/:username/:document` — save reading progress
  - `GET /api/koreader/users/:username/auth` — user authentication (auto-creates users)
- **Reading stats dashboard** — aggregate KPIs, recent activity, per-user breakdown
- **Library search** — search by title/filename with filters (EPUB, PDF, with cover, has progress)
- **Book covers** — served from base64 data URL cache, SVG placeholder fallback
- **Auto-refresh** — stats update every 4 seconds
- **Dark UI** — deep space aesthetic inspired by KOReader

[Unreleased]: https://github.com/your-username/koreader-sync/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/your-username/koreader-sync/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/your-username/koreader-sync/releases/tag/v1.0.0
