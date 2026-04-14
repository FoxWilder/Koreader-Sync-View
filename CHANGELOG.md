# Changelog

All notable changes to KOReader Sync will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

---

## [1.3] - 2026-04-14

### Added
- **EPUB metadata extraction** — title, authors, publisher, language, publication date, description,
  series name + index (Calibre tags), and spine item count extracted from OPF during scan/rebuild.
  Cached to `meta/{md5}.json`. No external dependencies — uses Node built-ins only.
- **Rebuild Cache** — new Settings action that wipes `book-md5-cache.json` and re-scans from scratch.
  Useful after renaming files or fixing hash mismatches. Separate from Scan Library (which merges).
- **`POST /api/koreader/settings/rebuild`** endpoint backing the Rebuild Cache button.
- **Activity heatmap** — 16-week reading streak visualisation on the dashboard.
- **Book detail modal** — click any book card to see full metadata, large cover, and progress.
- **`epub_page_count`** field on BookCard (spine item count proxy for chapter/section count).

### Changed
- **BookCard UI** — now shows author, series (#index), 2-line description, publisher, language,
  year, file size, and chapter count. Cards size to content (no fixed height).
- **Settings button** — moved from top-right (overlapping LAST SYNC badge) to bottom-left.
- **Library search** — shows result count, improved empty state, searches author/series metadata.
- **README** — updated with correct repo URLs, new features, updated data directory layout.

### Fixed
- **MD5 hash scheme** — cache keys now use `MD5(filename)` instead of `MD5(file content)`,
  matching how KOReader identifies documents. Existing installations should run Rebuild Cache.

---

## [1.2] - 2026-04-14

### Changed
- **Releases are now fully automatic** — every push to `main` creates a GitHub Release.
  Version = `{major}.{minor}.{CI run number}`.
- **Single PowerShell deployment script** (`koreader-sync.ps1`) replaces separate tarballs.
- **Unified service** — Express serves the dashboard as static files alongside the API.
- **Windows service management** — script auto-downloads NSSM, creates `KOReaderSync` service.
- **Auto-update** — running the script again detects the installed version and applies updates.
- **Uninstall flag** — `.\koreader-sync.ps1 -Uninstall` cleanly removes the service.

### Removed
- Separate `release.yml` workflow (merged into `build.yml`).
- Manual `git tag` release flow.

---

## [1.1] - 2026-04-14

### Added
- **Settings page** — configure local ebook library path from the UI.
- **Library scanner** — recursive MD5 indexing of local ebook directory.
- **Book covers** — extracted from EPUB files (ZIP/OPF parsing, no dependencies), cached as
  `covers/{md5}.txt` base64 data URLs. Extraction runs async after scan completes.
- **Scan progress indicator** — real-time status with file count and current file.
- **Rebuild Cache button** — wipes and regenerates the MD5 index.
- **GitHub Actions** — CI build + typecheck on every push and PR.
- **GitHub Pages preview** — dashboard deployed to GitHub Pages on main branch merges.

---

## [1.0] - 2026-04-14

### Added
- **KOReader progress sync API** — compatible with KOReader's built-in sync protocol.
  - `GET /api/koreader/syncs/:username/:document` — retrieve reading progress.
  - `PUT /api/koreader/syncs/:username/:document` — save reading progress.
  - `GET /api/koreader/users/:username/auth` — user authentication (auto-creates users).
- **Reading stats dashboard** — aggregate KPIs, recent activity, per-user breakdown.
- **Library search** — search by title/filename with filters (EPUB, PDF, with cover, has progress).
- **Auto-refresh** — stats update every 4 seconds.
- **Dark UI** — deep space aesthetic.

[Unreleased]: https://github.com/FoxWilder/Koreader-Sync-View/compare/v1.3...HEAD
[1.3]: https://github.com/FoxWilder/Koreader-Sync-View/compare/v1.2...v1.3
[1.2]: https://github.com/FoxWilder/Koreader-Sync-View/compare/v1.1...v1.2
[1.1]: https://github.com/FoxWilder/Koreader-Sync-View/compare/v1.0...v1.1
[1.0]: https://github.com/FoxWilder/Koreader-Sync-View/releases/tag/v1.0
