/**
 * Demo data for the GitHub Pages preview build (VITE_DEMO_MODE=true).
 * Intercepts all /api/koreader/* requests and returns realistic mock data.
 */

import type { StatsResponse, BookCard, Settings, ScanStatus } from "@workspace/api-client-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function tsAgo(days: number): number {
  return Math.floor((Date.now() - days * 86400 * 1000) / 1000);
}

// Build activity_by_day: reading activity over the last 16 weeks
function buildActivity(): Record<string, number> {
  const activity: Record<string, number> = {};
  const today = new Date();
  for (let i = 0; i < 112; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    // Simulate realistic reading patterns — more on weekends, gaps mid-week
    const dow = d.getDay();
    const rand = Math.random();
    if (dow === 0 || dow === 6) {
      if (rand > 0.25) activity[key] = Math.floor(rand * 8) + 1;
    } else if (dow === 5) {
      if (rand > 0.35) activity[key] = Math.floor(rand * 5) + 1;
    } else {
      if (rand > 0.55) activity[key] = Math.floor(rand * 3) + 1;
    }
  }
  return activity;
}

// ---------------------------------------------------------------------------
// Books
// ---------------------------------------------------------------------------

const BOOKS: BookCard[] = [
  {
    md5: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
    name: "The Fellowship of the Ring.epub",
    display_title: "The Fellowship of the Ring",
    display_author: "J.R.R. Tolkien",
    path: "/books/tolkien/The Fellowship of the Ring.epub",
    ext: "epub",
    folder: "tolkien",
    size_human: "1.2 MB",
    mtime_iso: daysAgo(120),
    has_cover: false,
    last_progress: 87.4,
    last_read_iso: daysAgo(1),
    last_user: "alice",
    last_device: "Kobo Libra 2",
    last_ts: tsAgo(1),
    epub_has_meta: true,
    epub_title: "The Fellowship of the Ring",
    epub_authors: ["J.R.R. Tolkien"],
    epub_publisher: "Allen & Unwin",
    epub_language: "en",
    epub_date: "1954-07-29",
    epub_series: "The Lord of the Rings",
    epub_series_index: "1",
    epub_subjects: ["Fantasy", "Epic"],
    epub_identifiers: ["isbn:9780261102354"],
    epub_description: "The first volume of J.R.R. Tolkien's epic masterwork, The Lord of the Rings. A young hobbit named Frodo Baggins inherits a mysterious ring and must leave his comfortable home to embark on a perilous quest.",
    epub_page_count: 22,
  },
  {
    md5: "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5",
    name: "The Two Towers.epub",
    display_title: "The Two Towers",
    display_author: "J.R.R. Tolkien",
    path: "/books/tolkien/The Two Towers.epub",
    ext: "epub",
    folder: "tolkien",
    size_human: "1.1 MB",
    mtime_iso: daysAgo(90),
    has_cover: false,
    last_progress: 100,
    last_read_iso: daysAgo(14),
    last_user: "alice",
    last_device: "Kobo Libra 2",
    last_ts: tsAgo(14),
    epub_has_meta: true,
    epub_title: "The Two Towers",
    epub_authors: ["J.R.R. Tolkien"],
    epub_publisher: "Allen & Unwin",
    epub_language: "en",
    epub_date: "1954-11-11",
    epub_series: "The Lord of the Rings",
    epub_series_index: "2",
    epub_subjects: ["Fantasy", "Epic"],
    epub_identifiers: ["isbn:9780261102361"],
    epub_description: "The second part of The Lord of the Rings. Frodo and Sam continue their journey to Mordor while Aragorn, Legolas and Gimli pursue the Uruk-hai.",
    epub_page_count: 20,
  },
  {
    md5: "c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6",
    name: "Dune.epub",
    display_title: "Dune",
    display_author: "Frank Herbert",
    path: "/books/scifi/Dune.epub",
    ext: "epub",
    folder: "scifi",
    size_human: "2.4 MB",
    mtime_iso: daysAgo(60),
    has_cover: false,
    last_progress: 42.1,
    last_read_iso: daysAgo(3),
    last_user: "bob",
    last_device: "Kindle Paperwhite",
    last_ts: tsAgo(3),
    epub_has_meta: true,
    epub_title: "Dune",
    epub_authors: ["Frank Herbert"],
    epub_publisher: "Chilton Books",
    epub_language: "en",
    epub_date: "1965-08-01",
    epub_series: "Dune Chronicles",
    epub_series_index: "1",
    epub_subjects: ["Science Fiction", "Space Opera"],
    epub_identifiers: ["isbn:9780441013593"],
    epub_description: "Set in the distant future amidst a feudal interstellar society, Dune tells the story of young Paul Atreides as his family accepts stewardship of the desert planet Arrakis.",
    epub_page_count: 48,
  },
  {
    md5: "d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1",
    name: "Project Hail Mary.epub",
    display_title: "Project Hail Mary",
    display_author: "Andy Weir",
    path: "/books/scifi/Project Hail Mary.epub",
    ext: "epub",
    folder: "scifi",
    size_human: "1.8 MB",
    mtime_iso: daysAgo(30),
    has_cover: false,
    last_progress: 100,
    last_read_iso: daysAgo(7),
    last_user: "alice",
    last_device: "Kobo Libra 2",
    last_ts: tsAgo(7),
    epub_has_meta: true,
    epub_title: "Project Hail Mary",
    epub_authors: ["Andy Weir"],
    epub_publisher: "Ballantine Books",
    epub_language: "en",
    epub_date: "2021-05-04",
    epub_series: "",
    epub_series_index: "",
    epub_subjects: ["Science Fiction", "Hard SF"],
    epub_identifiers: ["isbn:9780593135204"],
    epub_description: "A lone astronaut must save the earth from disaster in this propulsive, gripping thriller from the author of The Martian.",
    epub_page_count: 36,
  },
  {
    md5: "e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    name: "Sapiens.epub",
    display_title: "Sapiens: A Brief History of Humankind",
    display_author: "Yuval Noah Harari",
    path: "/books/nonfiction/Sapiens.epub",
    ext: "epub",
    folder: "nonfiction",
    size_human: "3.1 MB",
    mtime_iso: daysAgo(45),
    has_cover: false,
    last_progress: 61.8,
    last_read_iso: daysAgo(2),
    last_user: "bob",
    last_device: "Kindle Paperwhite",
    last_ts: tsAgo(2),
    epub_has_meta: true,
    epub_title: "Sapiens: A Brief History of Humankind",
    epub_authors: ["Yuval Noah Harari"],
    epub_publisher: "Harper",
    epub_language: "en",
    epub_date: "2015-02-10",
    epub_series: "",
    epub_series_index: "",
    epub_subjects: ["History", "Anthropology", "Non-fiction"],
    epub_identifiers: ["isbn:9780062316097"],
    epub_description: "From a renowned historian comes a groundbreaking narrative of humanity's creation and evolution — a #1 international bestseller — that explores the ways in which biology and history have defined us.",
    epub_page_count: 40,
  },
  {
    md5: "f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3",
    name: "The Martian.epub",
    display_title: "The Martian",
    display_author: "Andy Weir",
    path: "/books/scifi/The Martian.epub",
    ext: "epub",
    folder: "scifi",
    size_human: "1.5 MB",
    mtime_iso: daysAgo(200),
    has_cover: false,
    last_progress: 0,
    last_read_iso: "",
    last_user: "",
    last_device: "",
    last_ts: 0,
    epub_has_meta: true,
    epub_title: "The Martian",
    epub_authors: ["Andy Weir"],
    epub_publisher: "Crown Publishers",
    epub_language: "en",
    epub_date: "2014-02-11",
    epub_series: "",
    epub_series_index: "",
    epub_subjects: ["Science Fiction", "Survival"],
    epub_identifiers: ["isbn:9780804139021"],
    epub_description: "Six days ago, astronaut Mark Watney became one of the first people to walk on Mars. Now, he's sure he'll be the first person to die there.",
    epub_page_count: 31,
  },
  {
    md5: "a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0",
    name: "Neuromancer.epub",
    display_title: "Neuromancer",
    display_author: "William Gibson",
    path: "/books/scifi/Neuromancer.epub",
    ext: "epub",
    folder: "scifi",
    size_human: "0.9 MB",
    mtime_iso: daysAgo(300),
    has_cover: false,
    last_progress: 100,
    last_read_iso: daysAgo(60),
    last_user: "alice",
    last_device: "Kobo Libra 2",
    last_ts: tsAgo(60),
    epub_has_meta: true,
    epub_title: "Neuromancer",
    epub_authors: ["William Gibson"],
    epub_publisher: "Ace Books",
    epub_language: "en",
    epub_date: "1984-07-01",
    epub_series: "Sprawl",
    epub_series_index: "1",
    epub_subjects: ["Science Fiction", "Cyberpunk"],
    epub_identifiers: ["isbn:9780441569595"],
    epub_description: "The sky above the port was the color of television, tuned to a dead channel. Case was the sharpest data-thief in the matrix — until he crossed the wrong people.",
    epub_page_count: 24,
  },
  {
    md5: "b8c9d0e1f2a3b8c9d0e1f2a3b8c9d0e1",
    name: "Thinking Fast and Slow.pdf",
    display_title: "Thinking, Fast and Slow",
    display_author: "Daniel Kahneman",
    path: "/books/nonfiction/Thinking Fast and Slow.pdf",
    ext: "pdf",
    folder: "nonfiction",
    size_human: "4.2 MB",
    mtime_iso: daysAgo(150),
    has_cover: false,
    last_progress: 28.3,
    last_read_iso: daysAgo(10),
    last_user: "bob",
    last_device: "Kindle Paperwhite",
    last_ts: tsAgo(10),
    epub_has_meta: false,
    epub_title: "",
    epub_authors: [],
    epub_publisher: "",
    epub_language: "",
    epub_date: "",
    epub_series: "",
    epub_series_index: "",
    epub_subjects: [],
    epub_identifiers: [],
    epub_description: "",
    epub_page_count: 0,
  },
];

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

const STATS: StatsResponse = {
  active_books: 7,
  completed: 3,
  in_progress: 4,
  not_started: 4493,
  avg_progress: 58.2,
  users: 2,
  last_activity_iso: daysAgo(1),
  last_activity_age: "1 day ago",
  days_active_last14: 9,
  activity_by_day: buildActivity(),
  top_recent: BOOKS.filter(b => b.last_ts > 0).sort((a, b) => b.last_ts - a.last_ts).slice(0, 5),
  users_breakdown: [
    { user: "alice", books: 4, last_ts: tsAgo(1), last_iso: daysAgo(1), devices: ["Kobo Libra 2"] },
    { user: "bob",   books: 3, last_ts: tsAgo(2), last_iso: daysAgo(2), devices: ["Kindle Paperwhite"] },
  ],
};

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

const SETTINGS: Settings = {
  library_path: "C:\\Books",
  last_scan_iso: daysAgo(1),
  book_count: 4500,
  data_dir: "C:\\KOReaderSync\\data",
  covers_dir: "C:\\KOReaderSync\\data\\covers",
  users_dir: "C:\\KOReaderSync\\data\\users",
  cache_file: "C:\\KOReaderSync\\data\\book-md5-cache.json",
  supported_extensions: ["epub", "pdf", "mobi", "azw3", "cbz", "djvu", "fb2", "txt"],
};

const SCAN_STATUS: ScanStatus = {
  running: false,
  files_found: 4500,
  files_processed: 4500,
  current_file: "",
  started_at: daysAgo(1),
  finished_at: daysAgo(1),
  error: "",
};

// ---------------------------------------------------------------------------
// Mock fetch interceptor
// ---------------------------------------------------------------------------

export function installDemoFetch(): void {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = (init?.method ?? "GET").toUpperCase();

    function json(data: unknown, status = 200): Response {
      return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Stats
    if (url.includes("/api/koreader/stats")) return json(STATS);

    // Settings
    if (url.includes("/api/koreader/settings/scan/status")) return json(SCAN_STATUS);
    if (url.includes("/api/koreader/settings") && method === "GET") return json(SETTINGS);
    if (url.includes("/api/koreader/settings") && method === "POST") return json(SETTINGS);

    // Library search
    if (url.includes("/api/koreader/search")) {
      const urlObj = new URL(url, window.location.href);
      const q          = (urlObj.searchParams.get("q") ?? "").toLowerCase();
      const ext        = urlObj.searchParams.get("ext") ?? "";
      const onlyCover  = urlObj.searchParams.get("cover") === "1";
      const onlyRecent = urlObj.searchParams.get("recent") === "1";
      const user       = urlObj.searchParams.get("user") ?? "";
      const status     = urlObj.searchParams.get("status") ?? "";
      const lang       = urlObj.searchParams.get("lang") ?? "";
      const sort       = urlObj.searchParams.get("sort") ?? "recent";

      let results = BOOKS.filter(b => {
        if (ext && b.ext !== ext) return false;
        if (onlyCover && !b.has_cover) return false;
        if (onlyRecent && !b.last_ts) return false;
        if (user && b.last_user !== user) return false;
        if (status === "completed"   && b.last_progress < 99.5) return false;
        if (status === "in_progress" && (b.last_progress <= 0 || b.last_progress >= 99.5)) return false;
        if (status === "not_started" && b.last_progress > 0) return false;
        if (lang && b.epub_language.toLowerCase() !== lang.toLowerCase()) return false;
        if (q) {
          const hay = [b.display_title, b.display_author, b.epub_series, b.name, (b.epub_subjects ?? []).join(" ")].join(" ").toLowerCase();
          return hay.includes(q);
        }
        return true;
      });

      if (sort === "title")    results = results.sort((a, b) => (a.display_title ?? "").localeCompare(b.display_title ?? ""));
      else if (sort === "author")   results = results.sort((a, b) => (a.display_author ?? "").localeCompare(b.display_author ?? ""));
      else if (sort === "progress") results = results.sort((a, b) => b.last_progress - a.last_progress);
      else results = results.sort((a, b) => b.last_ts - a.last_ts);

      return json(results);
    }

    // Cover — return a placeholder SVG
    if (url.includes("/api/koreader/cover/")) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="180" viewBox="0 0 120 180">
        <rect width="120" height="180" fill="#1e293b"/>
        <rect x="10" y="10" width="100" height="160" rx="4" fill="#0f172a" stroke="#334155" stroke-width="1"/>
        <text x="60" y="95" font-family="monospace" font-size="10" fill="#64748b" text-anchor="middle">EPUB</text>
      </svg>`;
      return new Response(svg, { status: 200, headers: { "Content-Type": "image/svg+xml" } });
    }

    // Health
    if (url.includes("/api/koreader/health")) return json({ status: "ok" });

    // Sync endpoints — return 200 for demo
    if (url.includes("/api/koreader/users/auth")) return json({ authorized: true, user: "demo" });
    if (url.includes("/api/koreader/users/create")) return json({ message: "User registered" }, 201);
    if (url.includes("/api/koreader/syncs/progress")) return json({ progress: "0", percentage: 0, device: "demo", device_id: "demo", timestamp: 0 });

    // Rebuild / scan — no-op
    if (url.includes("/api/koreader/settings/rebuild") || url.includes("/api/koreader/settings/scan")) {
      return json(SCAN_STATUS);
    }

    // Anything else — pass through
    return originalFetch(input, init);
  };
}
